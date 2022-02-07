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
    const host = payload.site_url
    const gameName = JSON.parse(payload.data?.game ?? null)
    const successfulEmailsSent: any = []
    const rejectedEmails: any = []
    let thisGamesAmbassadors = []
    let emailSent
    let game

    if (gameName) {
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
        game = (await biketag.game(gameName, {
          source: 'sanity',
        })) as Game
        const ambassadors = (await biketag.ambassadors(undefined, {
          source: 'sanity',
        })) as Ambassador[]
        thisGamesAmbassadors = ambassadors.length
          ? ambassadors.filter((a) => game.ambassadors.indexOf(a?.name) !== -1)
          : []
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
          emailSent = await sendEmailsToAmbassadors(
            formName,
            `[${gameName}] A new BikeTag has been submitted for round #${tag.tagnumber}`,
            thisGamesAmbassadors,
            (a) => {
              if (a) {
                return {
                  tag,
                  host,
                  gameHost: `${host.replace('://', `://${gameName}`)}`,
                  region: gameName,
                  playerIP,
                  goCurrentMystery: 'SEE CURRENT MYSTERY',
                  footerText: 'BikeTag is an OpenSource project that you can contribute to anytime',
                  goToQueueButton: 'GO TO QUEUE',
                  newBikeTagPlayedText: 'A new round of BikeTag has been played!',
                  mainTitleText: 'this is the first tag to be queue for round #1',
                  mainParagraphText:
                    'Your game of BikeTag has AutoPost enabled, and this first tag will be chosen as the winner at the end of the AutoPost timer of 15 minutes.',
                  goToApproveButton: 'Go to the Queue now to approve/dequeue this submission',
                  goToWebsiteLink: 'or go to portland.biketag.org now',
                  comparisonText: 'FOUND TAG COMPARED TO CURRENT MYSTERY LOCATION',
                  foundTagBlurb:
                    'This is what the player [Ken] submitted as the found location image and information. If there is a problem with this submission, please go to the Queue to resolve the issue.',
                  currentMysteryBlurb:
                    'This is the current mystery location. You can see the full screen image in the app, if you need to, by clicking the button below.',
                  ambassadorsUrl: `${host}/#/queue?btaId=${a.id}`,
                  expiryHash: getEncodedExpiry({
                    btaId: a.id,
                    game: gameName,
                    tagnumber: tag.tagnumber,
                  }),
                }
              } else {
                return {
                  payload: JSON.stringify(payload),
                  game: gameName,
                  host,
                  playerIP,
                }
              }
            }
          )
          successfulEmailsSent.concat(emailSent.accepted)
          rejectedEmails.concat(emailSent.rejected)
          break
        case 'approve-queued-tag':
          // send app notification
          break
        default:
        case 'queue-tag-error':
          emailSent = await sendEmailsToAmbassadors(
            formName,
            `An error has occured for [${game.name}] BikeTag`,
            thisGamesAmbassadors,
            () => {
              return {
                payload: JSON.stringify(payload),
                host,
                game: game.name,
                playerIP,
              }
            }
          )
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
    } else {
      console.log('no game to work with', payload)
    }
  }
}
