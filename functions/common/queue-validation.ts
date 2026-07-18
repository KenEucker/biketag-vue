import { BikeTagClient, Game } from 'biketag'
import {
  deleteQueueImageGroupFromStorage,
  getBikeTagClientOpts,
  getGameStorageSlug,
  getImageSource,
  getQueueApiHost,
  getQueueImageFromStorage,
  loadQueueStorageImages,
  log,
} from './methods'
import { deleteQueueRejectionMarkersForImage, writeQueueRejectionMarker } from './queue-rejections'
import { screenBikeTagImageWithRoboflow } from './roboflow'

type QueueImageType = 'found' | 'mystery'

export type QueueValidationInput = {
  req?: Request
  gameName?: string
  formName?: string
  tag?: any
  imageType?: QueueImageType
  imageUrl?: string
}

const queueImageTypeFromForm = (formName?: string): QueueImageType | undefined => {
  if (formName === 'add-found-tag') return 'found'
  if (formName === 'add-mystery-tag') return 'mystery'
  return undefined
}

const queueImageKeyFromUrl = (imageUrl: string): string => {
  try {
    const key = new URL(imageUrl).pathname.slice(1)
    return key.startsWith('queue/') ? key : ''
  } catch {
    return imageUrl.startsWith('queue/') ? imageUrl : ''
  }
}

const getImageUrlFromInput = (input: QueueValidationInput, imageType?: QueueImageType): string => {
  if (input.imageUrl?.length) return input.imageUrl
  if (imageType === 'found') return input.tag?.foundImageUrl ?? ''
  if (imageType === 'mystery') return input.tag?.mysteryImageUrl ?? ''
  return input.tag?.foundImageUrl ?? input.tag?.mysteryImageUrl ?? ''
}

const getQueuePayloadFromNetlifySubmission = (payload: any): QueueValidationInput => {
  const tag = JSON.parse(payload?.data?.tag ?? '{}')
  const formName = payload?.form_name
  const imageType = queueImageTypeFromForm(formName)

  return {
    formName,
    tag,
    imageType,
    gameName: payload?.data?.game ?? tag.game,
  }
}

const reindexQueue = async (req: Request | undefined, game: Game, gameSlug: string) => {
  const adminBiketag = new BikeTagClient(getBikeTagClientOpts(req, true, true, game))
  const imageSource = getImageSource(game)

  if (imageSource === 'aws') {
    adminBiketag.config(
      {
        biketag: { host: process.env.HOST },
        aws: { region: game.awsRegion },
      },
      false,
      true,
    )
  }

  try {
    const queuePayload: any = {
      game: gameSlug,
      host: getQueueApiHost(gameSlug),
      imgur: { hash: game.queuehash },
      region: game.awsRegion,
      resize: false,
      reindex: true,
    }

    await adminBiketag.getQueue(queuePayload, { source: imageSource })
  } catch (err: any) {
    log('[queue-validate] Queue reindex failed', err, 'warn')
  }
}

export const validateQueueUpload = async (input: QueueValidationInput) => {
  const imageType = input.imageType ?? queueImageTypeFromForm(input.formName)
  const imageUrl = getImageUrlFromInput(input, imageType)
  const imageKey = queueImageKeyFromUrl(imageUrl)

  if (!imageType || !imageUrl.length || !imageKey.length) {
    return {
      success: false,
      skipped: true,
      error: 'queue image type and URL are required',
    }
  }

  const biketagOpts = getBikeTagClientOpts(input.req)
  if (input.gameName?.length) {
    biketagOpts.game = input.gameName.toLowerCase()
  }

  const biketag = new BikeTagClient(biketagOpts)
  const game = (await biketag.game(biketagOpts.game, {
    source: 'sanity',
    concise: true,
  })) as unknown as Game
  const gameSlug = getGameStorageSlug(game, biketagOpts.game)

  if (!game?.awsRegion?.length) {
    return {
      success: false,
      skipped: true,
      error: 'queue storage region is not configured',
    }
  }

  const storage = await loadQueueStorageImages(gameSlug, game.awsRegion)
  const queueImage = getQueueImageFromStorage(storage.images, imageKey)

  if (!queueImage) {
    return {
      success: true,
      skipped: true,
      error: 'queue image was not found in storage',
    }
  }

  if (queueImage.type !== imageType) {
    return {
      success: false,
      skipped: true,
      error: 'queue image type does not match payload',
    }
  }

  const screening = await screenBikeTagImageWithRoboflow(queueImage.url)
  log('[queue-validate] Roboflow screening result', {
    enabled: screening.enabled,
    passed: screening.passed,
    failOpen: screening.failOpen,
    key: queueImage.key,
    imageType,
    roboflowStatus: screening.roboflowStatus,
  })

  if (screening.passed) {
    await deleteQueueRejectionMarkersForImage(gameSlug, game.awsRegion, queueImage.key)
    return {
      success: true,
      deleted: false,
      screening,
      imageType,
      imageUrl: queueImage.url,
      key: queueImage.key,
    }
  }

  const deletion = await deleteQueueImageGroupFromStorage(
    gameSlug,
    game.awsRegion,
    queueImage.key,
    storage.keys,
  )
  const marker = await writeQueueRejectionMarker(
    gameSlug,
    game.awsRegion,
    queueImage,
    deletion.deleted,
    screening.reason,
    screening.message ?? 'This image was rejected because it does not meet BikeTag criteria.',
  )

  await reindexQueue(input.req, game, gameSlug)

  return {
    success: true,
    deleted: deletion.deleted.length > 0,
    deletedKeys: deletion.deleted,
    marker,
    screening,
    imageType,
    imageUrl: queueImage.url,
    key: queueImage.key,
  }
}

export const validateQueueSubmissionPayload = async (req: Request, payload: any) => {
  return validateQueueUpload({
    req,
    ...getQueuePayloadFromNetlifySubmission(payload),
  })
}
