import { BikeTagClient } from 'biketag'
import { Ambassador, Game } from 'biketag/lib/common/schema'
import request from 'request'
import { getBikeTagClientOpts, getEncodedExpiry, sendEmailsToAmbassadors } from './common/utils'

export const handler = async (event) => {
  const body = JSON.parse(event.body)
  const payload = body.payload
  let success = false
  if (payload) {
    const formName = payload.form_name
    const playerIP = payload.data?.playerId
    const host = payload.data?.host
    const tag = JSON.parse(payload.data?.tag ?? '{}')
    const successfulEmailsSent: any = []
    const rejectedEmails: any = []
    let thisGamesAmbassadors = []
    let emailSent
    let game

    if (formName !== 'queue-found-tag' || formName !== 'queue-mystery-tag') {
      console.log({ formName })
      const biketagOpts = getBikeTagClientOpts(
        {
          ...event,
          method: event.httpMethod,
        } as unknown as request.Request,
        true,
        true
      )
      const biketag = new BikeTagClient(biketagOpts)
      game = (await biketag.game(tag.game, {
        source: 'sanity',
      })) as Game
      const ambassadors = (await biketag.ambassadors(undefined, {
        source: 'sanity',
      })) as Ambassador[]
      thisGamesAmbassadors = ambassadors.filter((a) => game.ambassadors.indexOf(a.name) !== -1)
    } else {
      /// doing nothing, eh?
      success = true
    }

    switch (formName) {
      case 'queue-found-tag':
        // send app notification
        break
      case 'queue-mystery-tag':
        // send app notification
        break
      case 'submit-queued-tag':
        // send app notification
        emailSent = await sendEmailsToAmbassadors(formName, thisGamesAmbassadors, (a) => {
          if (a) {
            return {
              tag,
              host,
              region: game.name,
              playerIP,
              ambassadorsUrl: `${host}/#/play?btaId=${a.id}`,
              expiryHash: getEncodedExpiry({
                btaId: a.id,
                game: game.name,
                tagnumber: tag.tagnumber,
              }),
            }
          } else {
            return {
              payload: JSON.stringify(payload),
              game: game.name,
              host,
              playerIP,
            }
          }
        })
        successfulEmailsSent.concat(emailSent.accepted)
        rejectedEmails.concat(emailSent.rejected)
        break
      case 'approve-queued-tag':
        // send app notification
        break
      default:
      case 'queue-tag-error':
        emailSent = await sendEmailsToAmbassadors(formName, thisGamesAmbassadors, () => {
          return {
            payload: JSON.stringify(payload),
            host,
            game: game.name,
            playerIP,
          }
        })
        successfulEmailsSent.concat(emailSent.accepted)
        rejectedEmails.concat(emailSent.rejected)
        break
    }

    if (successfulEmailsSent.length) {
      console.log('success sending notifications and emails', successfulEmailsSent)
      success = true
    } else if (rejectedEmails.length) {
      console.log('error sending emails', rejectedEmails)
    }

    return {
      data: success,
      statusCode: success ? 200 : 400,
    }
  }
}
