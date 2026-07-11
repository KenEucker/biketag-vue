import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3'
import type { Game, Tag } from 'biketag'
import {
  createQueueStorageClient,
  getGameStorageSlug,
  log,
} from '../methods'
import type { RejectedQueueImage, ScreeningImageRole } from './types'

const queuePrimarySourceExtensions = ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.bmp'] as const
const queueSizedVariantSuffixes = ['_small', '_medium'] as const

const queueRejectedPrimaryImageKeyPattern =
  /^queue\/(.+?)--rejected(?:--([a-z0-9]+))?\.(webp|jpg|jpeg|png|gif|bmp)$/i

const queueRolePrimaryImageKeyPattern =
  /^queue\/(.+?)--(found|mystery|rejected)(?:--([a-z0-9]+))?\.(webp|jpg|jpeg|png|gif|bmp)$/i

const isStorageObjectNotFound = (error: unknown): boolean => {
  const name = (error as { name?: string })?.name
  const code = (error as { Code?: string; $metadata?: { httpStatusCode?: number } })?.Code
  const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode
  return name === 'NotFound' || name === 'NoSuchKey' || code === 'NotFound' || status === 404
}

const decodeQueueMetadataValue = (value: string): string => {
  try {
    if (!value || !/^[A-Za-z0-9+/=]+$/.test(value)) return value
    return Buffer.from(value, 'base64').toString('utf-8')
  } catch {
    return value
  }
}

const parseQueueObjectMetadata = (data?: string) => {
  if (!data) return undefined
  try {
    const tag = JSON.parse(decodeQueueMetadataValue(data))
    const tagnumber = typeof tag.t === 'number' ? tag.t : undefined
    if (tagnumber === undefined) return undefined
    return {
      tagnumber,
      playerId: tag.p as string | undefined,
      mysteryPlayer: tag.mp as string | undefined,
      foundPlayer: tag.fp as string | undefined,
      foundTime: typeof tag.ft === 'number' ? tag.ft : undefined,
    }
  } catch {
    return undefined
  }
}

export const getStorageKeyFromUrl = (url: string): string => {
  try {
    return new URL(url).pathname.slice(1)
  } catch {
    return ''
  }
}

export const getQueueImageFilenameBase = (imageUrlOrKey: string): string => {
  const key = imageUrlOrKey.includes('://') ? getStorageKeyFromUrl(imageUrlOrKey) : imageUrlOrKey
  const filename = key.split('/').pop() ?? ''
  return filename.replace(/\.(webp|jpg|jpeg|png|gif|bmp)$/i, '')
}

export const replaceQueueImageRoleInBase = (
  filenameBase: string,
  role: 'found' | 'mystery' | 'rejected',
): string => filenameBase.replace(/--(?:found|mystery|rejected)(?=(?:--|_|$))/i, `--${role}`)

const getVariantKeys = (bucket: string, filenameBase: string): string[] =>
  queueSizedVariantSuffixes.map((suffix) => `queue/${filenameBase}${suffix}.webp`)

const getPrimaryKeyCandidates = (filenameBase: string): string[] =>
  queuePrimarySourceExtensions.map((ext) => `queue/${filenameBase}${ext}`)

const storageObjectExists = async (
  client: S3Client,
  bucket: string,
  key: string,
): Promise<boolean> => {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return true
  } catch (error) {
    if (isStorageObjectNotFound(error)) return false
    throw error instanceof Error ? error : new Error(`storage check failed for ${key}`)
  }
}

const resolvePrimaryKey = async (
  client: S3Client,
  bucket: string,
  filenameBase: string,
  preferredKey?: string,
): Promise<string | undefined> => {
  const candidates = preferredKey?.length
    ? [preferredKey, ...getPrimaryKeyCandidates(filenameBase).filter((key) => key !== preferredKey)]
    : getPrimaryKeyCandidates(filenameBase)

  for (const key of candidates) {
    if (await storageObjectExists(client, bucket, key)) return key
  }

  return undefined
}

const copyQueueObject = async (
  client: S3Client,
  bucket: string,
  srcKey: string,
  destKey: string,
  metadata?: Record<string, string>,
): Promise<void> => {
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${srcKey}`,
      Key: destKey,
      ACL: 'public-read',
      MetadataDirective: metadata ? 'REPLACE' : 'COPY',
      ...(metadata ? { Metadata: metadata } : {}),
    }),
  )
}

const deleteQueueObjectIfExists = async (
  client: S3Client,
  bucket: string,
  key: string,
): Promise<void> => {
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
  } catch (error) {
    if (isStorageObjectNotFound(error)) return
    throw error instanceof Error ? error : new Error(`delete failed for ${key}`)
  }
}

const readPrimaryMetadata = async (
  client: S3Client,
  bucket: string,
  key: string,
): Promise<{ metadata: Record<string, string>; rejection?: string }> => {
  const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
  const metadata = { ...(head.Metadata ?? {}) }
  const rejection = metadata.rejection
  return { metadata, rejection }
}

const renameQueueObjectGroup = async (
  client: S3Client,
  bucket: string,
  region: string,
  sourceFilenameBase: string,
  targetFilenameBase: string,
  sourcePrimaryKey?: string,
  metadataUpdate?: (metadata: Record<string, string>) => Record<string, string>,
): Promise<{ primaryKey?: string; primaryUrl?: string }> => {
  const resolvedSourcePrimaryKey = await resolvePrimaryKey(
    client,
    bucket,
    sourceFilenameBase,
    sourcePrimaryKey,
  )

  if (!resolvedSourcePrimaryKey) {
    return {}
  }

  const sourceExtension = resolvedSourcePrimaryKey.match(/(\.[a-z0-9]+)$/i)?.[1] ?? '.webp'
  const targetPrimaryKey = `queue/${targetFilenameBase}${sourceExtension}`
  const { metadata } = await readPrimaryMetadata(client, bucket, resolvedSourcePrimaryKey)
  const nextMetadata = metadataUpdate ? metadataUpdate(metadata) : metadata

  await copyQueueObject(client, bucket, resolvedSourcePrimaryKey, targetPrimaryKey, nextMetadata)
  await deleteQueueObjectIfExists(client, bucket, resolvedSourcePrimaryKey)

  for (const suffix of queueSizedVariantSuffixes) {
    const sourceVariantKey = `queue/${sourceFilenameBase}${suffix}.webp`
    const targetVariantKey = `queue/${targetFilenameBase}${suffix}.webp`

    try {
      if (await storageObjectExists(client, bucket, sourceVariantKey)) {
        await copyQueueObject(client, bucket, sourceVariantKey, targetVariantKey)
        await deleteQueueObjectIfExists(client, bucket, sourceVariantKey)
      }
    } catch (error: any) {
      log(
        '[screening] failed to rename queue image variant',
        { sourceVariantKey, targetVariantKey, message: error?.message ?? String(error) },
        'warn',
      )
    }
  }

  return {
    primaryKey: targetPrimaryKey,
    primaryUrl: `https://${bucket}.${region}.cdn.digitaloceanspaces.com/${targetPrimaryKey}`,
  }
}

export const inferRejectedImageRole = (
  imageTagnumber: number,
  currentRound: number,
): ScreeningImageRole | undefined => {
  if (imageTagnumber === currentRound) return 'found'
  if (imageTagnumber === currentRound + 1) return 'mystery'
  return undefined
}

export const renameQueueImageToRejected = async (
  game: Game,
  imageUrl: string,
  reason: string,
  playerIp?: string,
): Promise<{ success: boolean; rejectedUrl?: string; rejectedKey?: string }> => {
  const gameSlug = getGameStorageSlug(game)
  const region = game.awsRegion ?? ''
  const bucket = `${gameSlug.toLowerCase()}-biketag`
  const client = createQueueStorageClient(region)
  const sourcePrimaryKey = getStorageKeyFromUrl(imageUrl)
  const sourceFilenameBase = getQueueImageFilenameBase(sourcePrimaryKey)
  const targetFilenameBase = replaceQueueImageRoleInBase(sourceFilenameBase, 'rejected')

  try {
    const result = await renameQueueObjectGroup(
      client,
      bucket,
      region,
      sourceFilenameBase,
      targetFilenameBase,
      sourcePrimaryKey.startsWith('queue/') ? sourcePrimaryKey : undefined,
      (metadata) => ({
        ...metadata,
        rejection: reason,
        ...(playerIp?.length ? { playerip: playerIp } : {}),
      }),
    )

    if (!result.primaryUrl) {
      log('[screening] rejected rename failed: source object missing', { imageUrl }, 'warn')
      return { success: false }
    }

    return { success: true, rejectedUrl: result.primaryUrl, rejectedKey: result.primaryKey }
  } catch (error: any) {
    log(
      '[screening] rejected rename failed',
      { imageUrl, message: error?.message ?? String(error) },
      'error',
    )
    return { success: false }
  }
}

export const restoreRejectedQueueImage = async (
  game: Game,
  imageUrl: string,
  targetRole: ScreeningImageRole,
): Promise<{ success: boolean; restoredUrl?: string }> => {
  const gameSlug = getGameStorageSlug(game)
  const region = game.awsRegion ?? ''
  const bucket = `${gameSlug.toLowerCase()}-biketag`
  const client = createQueueStorageClient(region)
  const sourcePrimaryKey = getStorageKeyFromUrl(imageUrl)
  const sourceFilenameBase = getQueueImageFilenameBase(sourcePrimaryKey)
  const targetFilenameBase = replaceQueueImageRoleInBase(sourceFilenameBase, targetRole)

  try {
    const result = await renameQueueObjectGroup(
      client,
      bucket,
      region,
      sourceFilenameBase,
      targetFilenameBase,
      sourcePrimaryKey.startsWith('queue/') ? sourcePrimaryKey : undefined,
      (metadata) => {
        const nextMetadata = { ...metadata }
        delete nextMetadata.rejection
        return nextMetadata
      },
    )

    if (!result.primaryUrl) {
      return { success: false }
    }

    return { success: true, restoredUrl: result.primaryUrl }
  } catch (error: any) {
    log(
      '[screening] rejected restore failed',
      { imageUrl, targetRole, message: error?.message ?? String(error) },
      'error',
    )
    return { success: false }
  }
}

export const deleteRejectedQueueImageGroup = async (game: Game, imageUrl: string): Promise<void> => {
  const gameSlug = getGameStorageSlug(game)
  const region = game.awsRegion ?? ''
  const bucket = `${gameSlug.toLowerCase()}-biketag`
  const client = createQueueStorageClient(region)
  const sourcePrimaryKey = getStorageKeyFromUrl(imageUrl)
  const filenameBase = getQueueImageFilenameBase(sourcePrimaryKey)
  const primaryKey = await resolvePrimaryKey(
    client,
    bucket,
    filenameBase,
    sourcePrimaryKey.startsWith('queue/') ? sourcePrimaryKey : undefined,
  )

  if (primaryKey) {
    await deleteQueueObjectIfExists(client, bucket, primaryKey)
  }

  for (const key of getVariantKeys(bucket, filenameBase)) {
    await deleteQueueObjectIfExists(client, bucket, key)
  }
}

const parseRejectedQueueImageKey = (key: string) => {
  const match = key.match(queueRejectedPrimaryImageKeyPattern)
  if (!match) return undefined

  const [, , playerHash = '', extension] = match
  const tagnumberMatch = key.match(/-tag-(\d+)--rejected/i)
  const tagnumber = tagnumberMatch ? parseInt(tagnumberMatch[1], 10) : undefined
  if (tagnumber === undefined) return undefined

  return {
    playerHash,
    extension: extension.toLowerCase(),
    tagnumber,
  }
}

export const listRejectedQueueImagesForRound = async (
  game: Game,
  currentRound: number,
): Promise<RejectedQueueImage[]> => {
  const gameSlug = getGameStorageSlug(game)
  const region = game.awsRegion ?? ''
  const bucket = `${gameSlug.toLowerCase()}-biketag`
  const client = createQueueStorageClient(region)
  const rejected: RejectedQueueImage[] = []

  for (const key of await listQueueObjectKeys(client, bucket, 'queue/')) {
    const parsed = parseRejectedQueueImageKey(key)
    if (!parsed) continue

    const role = inferRejectedImageRole(parsed.tagnumber, currentRound)
    if (!role) continue

    const filenameBase = getQueueImageFilenameBase(key)
    let playerId: string | undefined
    let foundPlayer: string | undefined
    let mysteryPlayer: string | undefined
    let reason = ''
    let rejectedAt: number | undefined
    let playerIp: string | undefined

    try {
      const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
      reason = head.Metadata?.rejection ?? ''
      rejectedAt = head.LastModified ? Math.floor(head.LastModified.getTime() / 1000) : undefined
      playerIp = head.Metadata?.playerip
      const meta = parseQueueObjectMetadata(head.Metadata?.data)
      playerId = meta?.playerId
      foundPlayer = meta?.foundPlayer
      mysteryPlayer = meta?.mysteryPlayer
    } catch {
      continue
    }

    if (!reason.length) continue

    rejected.push({
      key,
      url: `https://${bucket}.${region}.cdn.digitaloceanspaces.com/${key}`,
      smallUrl: `https://${bucket}.${region}.cdn.digitaloceanspaces.com/queue/${filenameBase}_small.webp`,
      mediumUrl: `https://${bucket}.${region}.cdn.digitaloceanspaces.com/queue/${filenameBase}_medium.webp`,
      type: role,
      tagnumber: parsed.tagnumber,
      playerId,
      playerIp,
      foundPlayer,
      mysteryPlayer,
      reason,
      rejectedAt,
    })
  }

  return rejected.sort((a, b) => (b.rejectedAt ?? 0) - (a.rejectedAt ?? 0))
}

export const findPlayerRejectedUpload = async (
  game: Game,
  currentRound: number,
  playerId: string,
): Promise<RejectedQueueImage | undefined> => {
  const rejectedImages = await listRejectedQueueImagesForRound(game, currentRound)
  return rejectedImages.find((image) => image.playerId === playerId)
}

export const validateQueueImageKeyForGame = (
  imageKey: string,
  gameSlug: string,
  currentRound: number,
  expectedRole?: ScreeningImageRole,
): boolean => {
  const match = imageKey.match(queueRolePrimaryImageKeyPattern)
  if (!match) return false

  const tagnumberMatch = imageKey.match(/-tag-(\d+)--(?:found|mystery|rejected)/i)
  const tagnumber = tagnumberMatch ? parseInt(tagnumberMatch[1], 10) : undefined
  if (tagnumber === undefined) return false

  if (!imageKey.toLowerCase().includes(`${gameSlug.toLowerCase()}-tag-`)) return false

  if (expectedRole === 'found' && tagnumber !== currentRound && tagnumber !== currentRound + 1) {
    return false
  }
  if (expectedRole === 'mystery' && tagnumber !== currentRound + 1) {
    return false
  }

  return true
}

export const playerHasQueueFoundImage = async (
  game: Game,
  playerId: string,
  currentRound: number,
): Promise<boolean> => {
  const gameSlug = getGameStorageSlug(game)
  const region = game.awsRegion ?? ''
  const bucket = `${gameSlug.toLowerCase()}-biketag`
  const client = createQueueStorageClient(region)

  for (const key of await listQueueObjectKeys(client, bucket, 'queue/')) {
    if (!/--found(?:--|_|\.)/i.test(key)) continue
    const tagnumberMatch = key.match(/-tag-(\d+)--found/i)
    const tagnumber = tagnumberMatch ? parseInt(tagnumberMatch[1], 10) : undefined
    if (tagnumber !== currentRound && tagnumber !== currentRound + 1) continue

    try {
      const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
      const meta = parseQueueObjectMetadata(head.Metadata?.data)
      if (meta?.playerId === playerId) return true
    } catch {
      continue
    }
  }

  return false
}

const listQueueObjectKeys = async (
  client: S3Client,
  bucket: string,
  prefix: string,
): Promise<string[]> => {
  const keys: string[] = []
  let continuationToken: string | undefined

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    )

    keys.push(
      ...((response.Contents?.map((entry) => entry.Key).filter((key): key is string => !!key?.length) ??
        []) as string[]),
    )
    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  return keys
}

export const buildTagFromRejectedImage = (
  rejected: RejectedQueueImage,
  game: Game,
  restoredMysteryUrl?: string,
): Partial<Tag> => {
  const gameSlug = getGameStorageSlug(game)
  const tag: Partial<Tag> = {
    tagnumber: rejected.tagnumber,
    game: gameSlug,
    playerId: rejected.playerId,
    foundPlayer: rejected.foundPlayer,
    mysteryPlayer: rejected.mysteryPlayer,
  }

  if (rejected.type === 'found') {
    tag.foundImageUrl = rejected.url.replace(/--rejected/i, '--found')
  } else if (restoredMysteryUrl) {
    tag.mysteryImageUrl = restoredMysteryUrl
  }

  return tag
}
