import type { BikeTagClient, Game } from 'biketag'
import { log } from '../methods'
import { isScreeningConfigured } from './config'
import { sendScreeningRejectionEmail } from './email'
import { renameQueueImageToRejected, validateQueueImageKeyForGame } from './rejected-storage'
import { screenImageWithRoboflow } from './roboflow'

export type ProcessQueueImageScreeningParams = {
  game: Game
  biketag: BikeTagClient
  imageUrl: string
  imageKey: string
  imageType: 'found' | 'mystery'
  playerId: string
  playerIp: string
  currentRound: number
}

export const processQueueImageScreening = async ({
  game,
  biketag,
  imageUrl,
  imageKey,
  imageType,
  playerId,
  playerIp,
  currentRound,
}: ProcessQueueImageScreeningParams): Promise<void> => {
  if (!isScreeningConfigured(game)) {
    log('[screen] Screening skipped — not configured for game', { game: game.name }, 'info')
    return
  }

  if (!validateQueueImageKeyForGame(imageKey, game.slug, currentRound, imageType)) {
    log('[screen] Invalid queue image for screening', { imageKey, imageType, currentRound }, 'warn')
    return
  }

  log(
    '[screen] Screening queue image with Roboflow',
    { imageType, imageKey, currentRound, playerId },
    'info',
  )

  const screeningResult = await screenImageWithRoboflow(imageUrl)
  if (!screeningResult) {
    log('[screen] Roboflow screening fail-open', { imageType, imageUrl }, 'warn')
    return
  }

  if (screeningResult.accepted) {
    log('[screen] Roboflow accepted image', { imageType, imageUrl }, 'info')
    return
  }

  log(
    '[screen] Roboflow rejected image',
    { imageType, imageUrl, reason: screeningResult.reason },
    'info',
  )

  const renameResult = await renameQueueImageToRejected(
    game,
    imageUrl,
    screeningResult.reason,
    playerIp,
  )
  if (!renameResult.success || !renameResult.rejectedUrl) {
    log('[screen] Rejection rename failed — fail-open', { imageUrl }, 'warn')
    return
  }

  const ambassadors = ((await biketag.ambassadors(undefined, {
    source: 'sanity',
  })) ?? []) as any[]
  const gameAmbassadors = ambassadors.filter((ambassador) =>
    game.ambassadors?.includes(ambassador.name),
  )

  const rejectedRecord = {
    key: renameResult.rejectedKey ?? '',
    url: renameResult.rejectedUrl,
    smallUrl: '',
    mediumUrl: '',
    type: imageType,
    tagnumber: imageType === 'found' ? currentRound : currentRound + 1,
    playerId,
    playerIp,
    reason: screeningResult.reason,
  }

  await sendScreeningRejectionEmail(game, gameAmbassadors, rejectedRecord, playerIp)
}
