import BikeTagClient from 'biketag'
import { Ambassador, Game } from 'biketag/lib/common/schema'
import request from 'request'
import { getBikeTagClientOpts, getEncodedExpiry, sendEmailNotification } from './common/utils'

export const handler = async (event) => {
  console.log(event.body)
  const body = JSON.parse(event.body)
  console.log({ body })
  const payload = body.payload
  let success = false
  if (payload) {
    console.log({ payload })
    const superAdmin = 'keneucker@gmail.com'
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
        thisGamesAmbassadors.forEach(async (ambassador) => {
          if (ambassador.email) {
            emailSent = await sendEmailNotification(ambassador.email, formName, {
              tag,
              host,
              region: game.name,
              playerIP,
              ambassadorsUrl: `${host}/#/queue?btaId=${ambassador.id}`,
              expiryHash: getEncodedExpiry({
                btaId: ambassador.id,
                game: game.name,
                tagnumber: tag.tagnumber,
              }),
            })
            successfulEmailsSent.concat(emailSent.accepted)
            rejectedEmails.concat(emailSent.rejected)
            if (superAdmin) {
              emailSent = await sendEmailNotification(superAdmin, formName, {
                payload: JSON.stringify(payload),
                game: game.name,
                host,
                playerIP,
              })
              successfulEmailsSent.concat(emailSent.accepted)
              rejectedEmails.concat(emailSent.rejected)
            }
          }
        })
        break
      case 'approve-queued-tag':
        // send app notification
        break
      default:
      case 'queue-tag-error':
        thisGamesAmbassadors.forEach(async (ambassador) => {
          if (ambassador.email) {
            emailSent = await sendEmailNotification(ambassador.email, 'queue-tag-error', {
              payload: JSON.stringify(payload),
              host,
              game: game.name,
              playerIP,
            })
            successfulEmailsSent.concat(emailSent.accepted)
            rejectedEmails.concat(emailSent.rejected)
          }
        })
        if (superAdmin) {
          emailSent = await sendEmailNotification(superAdmin, 'queue-tag-error', {
            payload: JSON.stringify(payload),
            game: game.name,
            host,
            playerIP,
          })
          successfulEmailsSent.concat(emailSent.accepted)
          rejectedEmails.concat(emailSent.rejected)
        }
        break
    }

    if (successfulEmailsSent.length) {
      console.log({ successfulEmailsSent })
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
