import { Ambassador, BikeTagClient, Game, Tag } from 'biketag'
import { ordinalSuffixOf } from '../src/common/format'
import { summarizeTagGps } from '../src/common/gps'
import {
  defaultLogo,
  getBikeTagClientOpts,
  getGameSiteUrl,
  getGameSocialLinks,
  getImageSource,
  getSanityImageUrl,
  getSubmissionQueuePosition,
  isGameEmailEnabled,
  log,
  sendEmailsToAmbassadors,
} from './common'
import { HttpStatusCode } from './common/constants'

export default async (req: Request) => {
  const body = await req.json()
  const payload = body.payload
  let success = false

  log('submission-created', { payload })
  /// TODO: is this necessary?
  // const bannedIP = await getIPIsBanned(payload.ip)

  // if (bannedIP) {
  //   console.error('ip address is banned', payload.ip)
  //   return {
  //     data: false,
  //     statusCode: HttpStatusCode.BadRequest,
  //   }
  // }

  if (payload) {
    const formName = payload.form_name
    const playerID = payload.data?.playerId
    const playerIP = payload.data?.playerIP ?? payload.data?.ip ?? payload.ip
    const tag = JSON.parse(payload.data?.tag ?? '{}')
    const gameName = payload.data?.game ?? tag.game ?? null
    if (
      formName === 'add-found-tag' ||
      formName === 'post-new-biketag' ||
      formName === 'approve-new-biketag'
    ) {
      log(
        'gps::submission-created',
        {
          formName,
          tagGps: summarizeTagGps(tag?.gps),
          tagnumber: tag?.tagnumber,
          gameName,
        },
        'info',
      )
    }
    let successfulEmailsSent: any = []
    let rejectedEmails: any = []
    let thisGamesAmbassadors: Ambassador[] = []
    let currentMysteryTag: Tag | undefined
    let emailSent
    let game: Game | undefined
    let numberInQueue: number | undefined
    let queuedTags: Tag[] = []

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

        const imageSource = getImageSource(game)
        if (imageSource === 'aws' && game.awsRegion?.length) {
          nonAdminBiketag.config(
            {
              biketag: { host: process.env.HOST },
              aws: { region: game.awsRegion },
            },
            false,
            true,
          )
          adminBiketag.config(
            {
              biketag: { host: process.env.HOST },
              aws: { region: game.awsRegion },
            },
            false,
            true,
          )
        }

        const ambassadors = (await adminBiketag.ambassadors(undefined, {
          source: 'sanity',
        })) as Ambassador[]
        thisGamesAmbassadors = ambassadors.length
          ? ambassadors.filter((a) => game!.ambassadors?.includes(a?.name))
          : []

        const currentMysteryTagResponse = await nonAdminBiketag.getTag(undefined, {
          source: imageSource,
        })
        currentMysteryTag = currentMysteryTagResponse.success
          ? (currentMysteryTagResponse.data as Tag)
          : undefined

        const requiresAmbassadorEmail =
          formName === 'post-new-biketag' ||
          formName === 'approve-tag-error' ||
          formName === 'post-tag-error'

        if (requiresAmbassadorEmail && !thisGamesAmbassadors.length) {
          log('no ambassadors configured for game', { gameName, formName })
          return {
            data: false,
            statusCode: HttpStatusCode.BadRequest,
          }
        }

        if (!requiresAmbassadorEmail && (!currentMysteryTag || !thisGamesAmbassadors.length)) {
          log('insufficient game data to work with', {
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

        if (!currentMysteryTag) {
          log(
            'current mystery tag unavailable; continuing with submission email',
            { gameName },
            'warn',
          )
        }

        try {
          const queueResponse = await nonAdminBiketag.getQueue(undefined, { source: imageSource })
          queuedTags = queueResponse.success ? (queueResponse.data as Tag[]) : []
          numberInQueue = getSubmissionQueuePosition(queuedTags, tag)
        } catch (err) {
          log('could not load queue for submission email', { gameName, err }, 'warn')
        }
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

      const autoPostSetting = game.settings?.['queue::autoPost']?.length
        ? parseInt(game.settings['queue::autoPost'])
        : 0
      const autoPostEnabled = autoPostSetting > 0
      const gameHost = getGameSiteUrl(gameName)
      const host = gameHost
      const socialLinks = getGameSocialLinks(game)
      const logo = new URL(game.logo?.length ? getSanityImageUrl(game.logo) : defaultLogo, host)
        .href

      if (isGameEmailEnabled(game, formName)) {
        log('processing form::', formName)
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
                    game: gameName,
                    region: gameName,
                    playerIP,
                    playerIp: playerIP,
                    playerID,
                    currentMysteryImageUrl: currentMysteryTag?.mysteryImageUrl?.length
                      ? currentMysteryTag.mysteryImageUrl
                      : '',
                    mysteryImageUrl: tag?.mysteryImageUrl?.length ? tag.mysteryImageUrl : '',
                    foundImageUrl: tag?.foundImageUrl?.length ? tag.foundImageUrl : '',
                    goCurrentMystery: 'SEE CURRENT MYSTERY',
                    currentMysteryHint: currentMysteryTag?.hint?.length
                      ? currentMysteryTag.hint
                      : '',
                    footerText:
                      'BikeTag is an OpenSource project that you can contribute to anytime',
                    goToQueueButton: 'GO TO QUEUE',
                    newBikeTagPlayedText: 'A new round of BikeTag has been queued!',
                    mainTitleText: numberInQueue
                      ? `This is the ${ordinalSuffixOf(numberInQueue)} submission in the queue for round #${tag.tagnumber}.`
                      : `A submission is ready for review for round #${tag.tagnumber}.`,
                    mainParagraphText: autoPostEnabled
                      ? `Your game of BikeTag has AutoPost enabled, and the first tag submitted will be chosen as the winner at the end of the AutoPost timer of ${autoPostSetting} minutes.`
                      : 'You must approve the winning tag before the game can move on to the next round.',
                    goToApproveButton: 'Go to the Queue now to approve/dequeue this submission',
                    goToWebsiteLink: `Go to ${gameHost}/login to sign in`,
                    comparisonText: currentMysteryTag?.mysteryImageUrl
                      ? 'Compare the found tag with the current mystery location below.'
                      : 'Open the queue to review the submission photos and location.',
                    foundLocation: tag.foundLocation?.trim() || 'Location not provided',
                    foundTagBlurb: `This is what the player [${tag.foundPlayer}] submitted as the found location image and information. If there is a problem with this submission, please go to the Queue to resolve the issue.`,
                    currentMysteryBlurb:
                      'This is the current mystery location. You can see the full screen image in the app, if you need to, by clicking the button below.',
                    ambassadorsUrl: `${gameHost}/queue`,
                    redditLink: socialLinks.redditLink,
                    blueskyLink: socialLinks.blueskyLink,
                    instagramLink: socialLinks.instagramLink,
                  }
                } else {
                  return {
                    payload: JSON.stringify(payload),
                    game: gameName,
                    tagnumber: tag.tagnumber,
                    host: gameHost,
                    playerIP,
                    playerIp: playerIP,
                    playerID,
                  }
                }
              },
            )
            successfulEmailsSent = successfulEmailsSent.concat(emailSent.accepted)
            rejectedEmails = rejectedEmails.concat(emailSent.rejected)
            break
          case 'approve-new-biketag':
            // Publication notifications are sent by autopost-notify for both approval paths.
            break
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
                  host: gameHost,
                  logo,
                  playerIP,
                  playerIp: playerIP,
                  playerID,
                }
              },
            )
            successfulEmailsSent = successfulEmailsSent.concat(emailSent.accepted)
            rejectedEmails = rejectedEmails.concat(emailSent.rejected)
            break
        }
      } else {
        log(
          `Sending of email:${formName} disabled`,
          {
            sendAll: game.settings['emails::sendall'],
            disabled: game.settings['emails::disable'],
          },
          'info',
        )
      }

      if (successfulEmailsSent.length) {
        log(
          'email delivery completed',
          {
            successfulEmailsSent,
            rejectedEmails,
          },
          rejectedEmails.length ? 'warn' : 'info',
        )
        success = !rejectedEmails.length
      } else if (rejectedEmails.length) {
        log('error sending emails', rejectedEmails)
      } else {
        log('nothing to do')
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
