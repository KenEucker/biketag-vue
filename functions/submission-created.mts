import { Ambassador, BikeTagClient, Game, Tag } from 'biketag'
import { getBannedIPs, stringifyNumber } from '../src/common'
import {
  defaultLogo,
  getBikeTagClientOpts,
  getEncodedExpiry,
  getSanityImageUrl,
  sendEmailsToAmbassadors,
} from './common'
import { HttpStatusCode } from './common/constants'

export default async (req: Request) => {
  const body = await req.json()
  const payload = body.payload
  let success = false

  console.log('submission-created', { payload })
  const bannedIPs = await getBannedIPs()

  if (bannedIPs.indexOf(payload.ip) !== -1) {
    console.error('ip address is banned', payload.ip)
    return {
      data: false,
      statusCode: HttpStatusCode.BadRequest,
    }
  }

  if (payload) {
    const formName = payload.form_name
    const host = payload.site_url
    const playerID = payload.data?.playerId
    const playerIP = payload.data?.playerIP
    const tag = JSON.parse(payload.data?.tag ?? '{}')
    const gameName = payload.data?.game ?? tag.game ?? null
    let successfulEmailsSent: any = []
    let rejectedEmails: any = []
    let thisGamesAmbassadors: Ambassador[] = []
    let currentMysteryTag: Tag | undefined
    let emailSent
    let game: Game | undefined
    let numberInQueue: number = -1
    let queuedTags

    if (gameName) {
      if (formName !== 'add-found-tag' && formName !== 'add-mystery-tag') {
        const nonAdminBiketagOpts = getBikeTagClientOpts(req, true, false, {
          name: gameName.toLowerCase(),
        } as Game)
        const adminBiketagOpts = getBikeTagClientOpts(req, true, true, {
          name: gameName.toLowerCase(),
        } as Game)
        /// TODO: fix whatever is wrong with the biketag-api interface
        const nonAdminBiketag = new BikeTagClient(nonAdminBiketagOpts)
        const adminBiketag = new BikeTagClient(adminBiketagOpts)
        game = (await nonAdminBiketag.game(undefined, {
          source: 'sanity',
        })) as Game

        if (!game) {
          console.error('no game found for', gameName, payload)
          return {
            data: false,
            statusCode: HttpStatusCode.BadRequest,
          }
        }

        const ambassadors = (await adminBiketag.ambassadors(undefined, {
          source: 'sanity',
        })) as Ambassador[]
        thisGamesAmbassadors = ambassadors.length
          ? ambassadors.filter((a) => game!.ambassadors.indexOf(a?.name) !== -1)
          : []

        const currentMysteryTagResponse = (await nonAdminBiketag.tags()) as Tag[]
        currentMysteryTag = currentMysteryTagResponse?.length
          ? currentMysteryTagResponse[0]
          : undefined

        if (!game || !currentMysteryTag || !thisGamesAmbassadors.length) {
          console.log('insufficient game data to work with', {
            gameName,
            game,
            ambassadors,
            thisGamesAmbassadors,
            currentMysteryTag,
          })
          return {
            data: false,
            statusCode: HttpStatusCode.BadRequest,
          }
        }

        queuedTags = (await nonAdminBiketag.queue()) as Tag[]
        numberInQueue = queuedTags.reduce((o: number, t: Tag, i: number) => {
          o = t.foundPlayer === tag.foundPlayer && t.mysteryPlayer === tag.mysteryPlayer ? i + 1 : o
          return o
        }, 1)
      } else {
        /// doing nothing, eh?
        success = true
      }

      if (!game) {
        console.error('no game found for', gameName, payload)
        return {
          data: false,
          statusCode: HttpStatusCode.BadRequest,
        }
      }

      const autoPostEnabled = true
      const logo = game.logo?.length
        ? game.logo.indexOf('imgur.co') !== -1
          ? game.logo
          : getSanityImageUrl(game.logo)
        : `${host}${defaultLogo}`
      const gameHost = `${host.replace('://', `://${gameName}.`)}`
      const tagQueuedNumber = stringifyNumber(numberInQueue)

      if (
        !game.settings['emails::sendall'] ||
        game.settings['emails::sendall'] === 'true' ||
        game.settings['emails::disable']?.split(',').indexOf(formName) === -1
      ) {
        console.log('processing form::', formName)
        switch (formName) {
          case 'add-found-tag':
            // send app notification
            break
          case 'add-mystery-tag':
            // send app notification
            break
          case 'post-new-biketag':
            // send app notification
            emailSent = await sendEmailsToAmbassadors(
              formName,
              `A new BikeTag has been submitted for round #${tag.tagnumber} in [${gameName}]`,
              thisGamesAmbassadors,
              (a) => {
                if (a) {
                  return {
                    tag,
                    host,
                    logo,
                    gameHost,
                    region: gameName,
                    playerIP,
                    playerID,
                    currentMysteryImageUrl: currentMysteryTag?.mysteryImageUrl?.length
                      ? currentMysteryTag.mysteryImageUrl
                      : '',
                    mysteryImageUrl: tag?.mysteryImageUrl?.length ? tag.mysteryImageUrl : '',
                    foundImageUrl: tag?.foundImageUrl?.length ? tag.foundImageUrl : '',
                    goCurrentMystery: 'SEE CURRENT MYSTERY',
                    currentMysteryHint: `current hint: "${currentMysteryTag?.hint}"`,
                    footerText:
                      'BikeTag is an OpenSource project that you can contribute to anytime',
                    goToQueueButton: 'GO TO QUEUE',
                    newBikeTagPlayedText: 'A new round of BikeTag has been queued!',
                    mainTitleText: `this is the ${tagQueuedNumber} tag to be queue for round #${tag?.tagnumber}`,
                    mainParagraphText: autoPostEnabled
                      ? 'Your game of BikeTag has AutoPost enabled, and the first tag submitted will be chosen as the winner at the end of the AutoPost timer of 15 minutes.'
                      : 'You must approve the winning tag before the game can move on to the next round.',
                    goToApproveButton: 'Go to the Queue now to approve/dequeue this submission',
                    goToWebsiteLink: `or go to ${gameHost}/login`,
                    comparisonText: 'FOUND TAG COMPARED TO CURRENT MYSTERY LOCATION',
                    foundLocation: 'FOUND HERE',
                    foundTagBlurb: `This is what the player [${tag.foundPlayer}] submitted as the found location image and information. If there is a problem with this submission, please go to the Queue to resolve the issue.`,
                    currentMysteryBlurb:
                      'This is the current mystery location. You can see the full screen image in the app, if you need to, by clicking the button below.',
                    ambassadorsUrl: `${gameHost}/queue?btaId=${a.id}`,
                    redditLink: `https://reddit.com/r/${
                      game!.settings['subreddit']?.length ? game!.settings['subreddit'] : 'biketag'
                    }`,
                    blueskyLink: `https://bsky.app/profile/${
                      game!.settings['bsky']?.length
                        ? game!.settings['bsky']
                        : 'biketag.bsky.social'
                    }`,
                    // instagramLink: `https://www.reddit.com/r/${game. ?? 'biketag'}`,
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
                    tagnumber: tag.tagnumber,
                    host,
                    playerIP,
                    playerID,
                  }
                }
              },
            )
            successfulEmailsSent = successfulEmailsSent.concat(emailSent.accepted)
            rejectedEmails = rejectedEmails.concat(emailSent.rejected)
            break
          case 'approve-new-biketag':
            /// Deprecated
            // send app notification
            // console.log('are there quedTags?', queuedTags)
            // if (queuedTags.length) {
            //   qeueCleared = await archiveAndClearQueue(queuedTags, game)
            //   success = !qeueCleared.errors
            //   emailSent = await sendEmailsToAmbassadors(
            //     formName,
            //     `${queuedTags.length} Tags left in the round were added to the archive`,
            //     thisGamesAmbassadors,
            //     (a) => {
            //       if (a) {
            //         return {
            //           tag,
            //           host,
            //           logo,
            //           gameHost,
            //           region: gameName,
            //           playerIP,
            //           currentMysteryImageUrl: currentMysteryTag?.mysteryImageUrl?.length
            //             ? currentMysteryTag.mysteryImageUrl
            //             : '',
            //           mysteryImageUrl: tag?.mysteryImageUrl?.length ? tag.mysteryImageUrl : '',
            //           foundImageUrl: tag?.foundImageUrl?.length ? tag.foundImageUrl : '',
            //           goCurrentMystery: 'SEE CURRENT MYSTERY',
            //           currentMysteryHint: `current hint: "${currentMysteryTag?.hint}"`,
            //           footerText:
            //             'BikeTag is an OpenSource project that you can contribute to anytime',
            //           goToQueueButton: 'GO TO QUEUE',
            //           newBikeTagPlayedText: 'A new round of BikeTag has been queued!',
            //           mainTitleText: `this is the ${tagQueuedNumber} tag to be queue for round #${tag?.tagnumber}`,
            //           mainParagraphText: autoPostEnabled
            //             ? 'Your game of BikeTag has AutoPost enabled, and the first tag submitted will be chosen as the winner at the end of the AutoPost timer of 15 minutes.'
            //             : 'You must approve the winning tag before the game can move on to the next round.',
            //           goToApproveButton: 'Go to the Queue now to approve/dequeue this submission',
            //           goToWebsiteLink: `or go to ${gameHost}/login`,
            //           comparisonText: 'FOUND TAG COMPARED TO CURRENT MYSTERY LOCATION',
            //           foundLocation: 'FOUND HERE',
            //           foundTagBlurb: `This is what the player [${tag.foundPlayer}] submitted as the found location image and information. If there is a problem with this submission, please go to the Queue to resolve the issue.`,
            //           currentMysteryBlurb:
            //             'This is the current mystery location. You can see the full screen image in the app, if you need to, by clicking the button below.',
            //           ambassadorsUrl: `${gameHost}/queue?btaId=${a.id}`,
            //           redditLink: `https://reddit.com/r/${
            //             game.subreddit?.length ? game.subreddit : 'biketag'
            //           }`,
            //           blueskyLink: `https://bsky.app/profile/${
            //             game.bsky?.length ? game.bsky : 'biketag.bsky.social'
            //           }`,
            //           // instagramLink: `https://www.reddit.com/r/${game. ?? 'biketag'}`,
            //         }
            //       } else {
            //         return {
            //           payload: JSON.stringify(payload),
            //           game: gameName,
            //           host,
            //           playerIP,
            //         }
            //       }
            //     },
            //   )
            //   successfulEmailsSent = successfulEmailsSent.concat(emailSent.accepted)
            //   rejectedEmails = rejectedEmails.concat(emailSent.rejected)
            // }
            break
          default:
          case 'approve-tag-error':
          case 'post-tag-error':
            emailSent = await sendEmailsToAmbassadors(
              formName,
              `An error has occured for [${game.name}] BikeTag`,
              thisGamesAmbassadors,
              () => {
                return {
                  payload: JSON.stringify(payload),
                  game: gameName,
                  host,
                  playerIP,
                  playerID,
                }
              },
            )
            successfulEmailsSent = successfulEmailsSent.concat(emailSent.accepted)
            rejectedEmails = rejectedEmails.concat(emailSent.rejected)
            break
        }
      } else {
        console.log(`Sending of email:${formName} disabled`, {
          sendAll: game.settings['emails::sendall'],
          disabled: game.settings['emails::disable'],
        })
      }

      if (successfulEmailsSent.length) {
        console.log('success sending notifications and emails', {
          successfulEmailsSent,
          rejectedEmails,
        })
        success = true
      } else if (rejectedEmails.length) {
        console.log('error sending emails', rejectedEmails)
      } else {
        console.log('nothing to do')
      }
    } else {
      console.error('no game to work with', payload)
    }

    return {
      data: success,
      statusCode: success ? HttpStatusCode.Ok : HttpStatusCode.BadRequest,
    }
  }
}
