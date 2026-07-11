import type { Ambassador, Game } from 'biketag'
import { getGameSiteUrl, log, sendEmailsToAmbassadors } from '../methods'
import type { RejectedQueueImage } from './types'

const SCREENING_REJECTION_EMAIL = 'post-biketag-screening-rejection'

export const sendScreeningRejectionEmail = async (
  game: Game,
  ambassadors: Ambassador[],
  rejected: RejectedQueueImage,
  playerIp?: string,
): Promise<void> => {
  const host = getGameSiteUrl(game.name)
  const imageTypeLabel = rejected.type === 'found' ? 'found' : 'mystery'
  const roundNumber =
    rejected.type === 'found' ? rejected.tagnumber : Math.max(1, rejected.tagnumber - 1)
  const subject = `A ${imageTypeLabel} BikeTag image was rejected for round #${roundNumber} in [${game.name}]`

  await sendEmailsToAmbassadors(
    SCREENING_REJECTION_EMAIL,
    subject,
    ambassadors,
    () => ({
      host,
      game: game.name,
      roundNumber,
      imageType: imageTypeLabel,
      playerId: rejected.playerId ?? '',
      playerIP: playerIp ?? '',
      imageUrl: rejected.url,
      reason: rejected.reason,
      rejectionsUrl: `${host}/rejections`,
      subdomainIcon: game.logo?.length ? game.logo : '/images/BikeTag.svg',
    }),
    true,
  )

  log('[screening] sent rejection email', { game: game.name, roundNumber, imageTypeLabel }, 'info')
}
