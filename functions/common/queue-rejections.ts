import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import type { QueueStorageImage } from './methods'
import { createQueueStorageClient } from './methods'

export type QueueRejectionMarker = {
  type: 'biketag-queue-rejection'
  version: 1
  game: string
  imageType: 'found' | 'mystery'
  tagnumber: number
  playerId?: string
  foundPlayer?: string
  mysteryPlayer?: string
  reason?: string
  message: string
  deletedImageKey: string
  deletedImageKeys: string[]
  deletedImageUrl: string
  markerKey: string
  createdAt: string
  source: 'roboflow'
}

const queueImageExtensionPattern = /\.(webp|jpe?g|png|gif|bmp)$/i

const getBucketName = (gameSlug: string): string => `${gameSlug.toLowerCase()}-biketag`

const listQueueKeys = async (gameSlug: string, region: string): Promise<string[]> => {
  const client = createQueueStorageClient(region)
  const bucket = getBucketName(gameSlug)
  const keys: string[] = []
  let continuationToken: string | undefined

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: 'queue/',
        ContinuationToken: continuationToken,
      }),
    )
    keys.push(
      ...(response.Contents?.map((obj) => obj.Key).filter((key): key is string => !!key) ?? []),
    )
    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  return keys
}

export const getQueueRejectionMarkerKey = (primaryImageKey: string): string => {
  const baseKey = primaryImageKey
    .replace(queueImageExtensionPattern, '')
    .replace(/_(medium|small)$/i, '')
  return `${baseKey}_medium.webp.json`
}

const getPossibleQueueRejectionMarkerKeys = (primaryImageKey: string): string[] => {
  const baseKey = primaryImageKey
    .replace(queueImageExtensionPattern, '')
    .replace(/_(medium|small)$/i, '')
  return [
    `${baseKey}.webp.json`,
    `${baseKey}.jpg.json`,
    `${baseKey}.jpeg.json`,
    `${baseKey}.png.json`,
    `${baseKey}_medium.webp.json`,
    `${baseKey}_small.webp.json`,
  ]
}

const readJsonObject = async (gameSlug: string, region: string, key: string): Promise<any> => {
  const client = createQueueStorageClient(region)
  const bucket = getBucketName(gameSlug)
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  const body = await response.Body?.transformToString('utf-8')
  return JSON.parse(body ?? '{}')
}

export const writeQueueRejectionMarker = async (
  gameSlug: string,
  region: string,
  image: QueueStorageImage,
  deletedImageKeys: string[],
  reason: string | undefined,
  message: string,
): Promise<QueueRejectionMarker> => {
  const client = createQueueStorageClient(region)
  const bucket = getBucketName(gameSlug)
  const markerKey = getQueueRejectionMarkerKey(image.key)
  const marker: QueueRejectionMarker = {
    type: 'biketag-queue-rejection',
    version: 1,
    game: gameSlug,
    imageType: image.type,
    tagnumber: image.tagnumber,
    playerId: image.playerId,
    foundPlayer: image.foundPlayer,
    mysteryPlayer: image.mysteryPlayer,
    reason,
    message,
    deletedImageKey: image.key,
    deletedImageKeys: deletedImageKeys.length ? deletedImageKeys : [image.key],
    deletedImageUrl: image.url,
    markerKey,
    createdAt: new Date().toISOString(),
    source: 'roboflow',
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: markerKey,
      Body: JSON.stringify(marker),
      ContentType: 'application/json',
      ACL: 'public-read',
      CacheControl: 'no-cache, no-store, must-revalidate',
    }),
  )

  return marker
}

export const deleteQueueRejectionMarkersForImage = async (
  gameSlug: string,
  region: string,
  primaryImageKey: string,
): Promise<string[]> => {
  const client = createQueueStorageClient(region)
  const bucket = getBucketName(gameSlug)
  const deleted: string[] = []

  for (const key of getPossibleQueueRejectionMarkerKeys(primaryImageKey)) {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
      deleted.push(key)
    } catch {
      // Deleting a missing marker is harmless.
    }
  }

  return deleted
}

export const loadQueueRejectionMarkers = async (
  gameSlug: string,
  region: string,
): Promise<QueueRejectionMarker[]> => {
  const keys = await listQueueKeys(gameSlug, region)
  const keySet = new Set(keys)
  const markerKeys = keys.filter((key) => /^queue\/.+\.webp\.json$/i.test(key))
  const markers: QueueRejectionMarker[] = []

  for (const markerKey of markerKeys) {
    try {
      const marker = (await readJsonObject(gameSlug, region, markerKey)) as QueueRejectionMarker
      if (marker.type !== 'biketag-queue-rejection') continue

      const deletedImageKeys = marker.deletedImageKeys?.length
        ? marker.deletedImageKeys
        : [marker.deletedImageKey]

      if (deletedImageKeys.some((imageKey) => keySet.has(imageKey))) {
        continue
      }

      markers.push({
        ...marker,
        markerKey,
        deletedImageKeys,
      })
    } catch {
      // Ignore unreadable marker files so a malformed sidecar cannot break queue loading.
    }
  }

  return markers.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}
