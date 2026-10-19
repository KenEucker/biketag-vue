import type { Ambassador, Game } from 'biketag'
import { getGameSiteUrl, getSanityImageUrl, log } from '../methods'
import { isGameEmailEnabled, sendEmailsToAmbassadors } from '../email'
import type { RejectedQueueImage } from './types'

const SCREENING_REJECTION_EMAIL = 'post-biketag-screening-rejection'

export const sendScreeningRejectionEmail = async (
  game: Game,
  ambassadors: Ambassador[],
  rejected: RejectedQueueImage,
  playerIp?: string,
): Promise<void> => {
  if (!isGameEmailEnabled(game, SCREENING_REJECTION_EMAIL)) {
    log('[screening] rejection email disabled', { game: game.name }, 'info')
    return
  }
  const host = getGameSiteUrl(game.name)
  const imageTypeLabel = rejected.type === 'found' ? 'found' : 'mystery'
  const roundNumber =
    rejected.type === 'found' ? rejected.tagnumber : Math.max(1, rejected.tagnumber - 1)
  const subject = `A ${imageTypeLabel} BikeTag image was rejected for round #${roundNumber} in [${game.name}]`

  const delivery = await sendEmailsToAmbassadors(
    SCREENING_REJECTION_EMAIL,
    subject,
    ambassadors,
    () => ({
      host,
      game: game.name,
      roundNumber,
      imageType: imageTypeLabel,
      playerId: rejected.playerId ?? '',
      playerIP: playerIp ?? rejected.playerIp ?? '',
      imageUrl: rejected.url,
      reason: rejected.reason,
      rejectionsUrl: `${host}/rejections`,
      subdomainIcon: new URL(
        game.logo?.length ? getSanityImageUrl(game.logo, 's') : '/images/BikeTag.svg',
        host,
      ).href,
    }),
    true,
  )

  log(
    '[screening] rejection email delivery',
    {
      game: game.name,
      roundNumber,
      imageTypeLabel,
      ...delivery,
    },
    delivery.rejected.length ? 'error' : 'info',
  )
}
