import { builder, Handler } from '@netlify/functions'
import {
  getBikeTagClientOpts,
  sendEmailsToAmbassadors,
  getSanityImageUrl,
  defaultLogo,
} from './common/methods'
import { BikeTagClient } from 'biketag'
import { Ambassador, Game, Tag } from 'biketag/lib/common/schema'
import request from 'request'
import axios from 'axios'

const cronHandler: Handler = async (event) => {
  console.log('cron: running biketag default job')
  const biketagOpts = getBikeTagClientOpts(
    {
      ...event,
      method: event.httpMethod,
    } as unknown as request.Request,
    true,
    true
  )
  delete biketagOpts.game
  let biketag = new BikeTagClient(biketagOpts)
  const gamesResponse = await biketag.getGame(undefined, {
    source: 'sanity',
  })
  const results = []
  let errors = false

  if (gamesResponse.success) {
    const games = gamesResponse.data as unknown as Game[]
    console.log('cron: checking games for active queued tags')

    for (const game of games) {
      const autoPostSetting =
        game.settings && !!game.settings['queue::autoPost']
          ? parseInt(game.settings['queue::autoPost'])
          : 0

      console.log({ autoPostSetting, queuehash: game.queuehash })
      if (autoPostSetting && game.queuehash?.length) {
        /************** GET WINNING QUEUE *****************/
        const adminBikeTagOpts = getBikeTagClientOpts(
          {
            ...event,
            method: event.httpMethod,
          } as unknown as request.Request,
          true,
          true
        )
        adminBikeTagOpts.game = game.name.toLocaleLowerCase()
        adminBikeTagOpts.imgur.hash = game.mainhash
        adminBikeTagOpts.imgur.queuehash = game.queuehash
        adminBikeTagOpts.imgur.archivehash = game.archivehash

        biketag = new BikeTagClient(adminBikeTagOpts)
        const getQueueResponse = await biketag.getQueue(undefined, {
          source: 'imgur',
        })
        const activeQueue = getQueueResponse.success ? getQueueResponse.data : []
        if (activeQueue?.length) {
          console.log(
            `cron: [${game.name}] game has autoPost setting of [${autoPostSetting} minutes] and actively queued tags`,
            activeQueue
          )

          const completedTags = activeQueue.filter(
            (t) => t.foundImageUrl?.length && t.mysteryImageUrl?.length
          )

          if (completedTags.length) {
            const now = Date.now()
            const tagAutoPostTimer = 1000 * 60 * 1 //autoPostSetting
            const timedOutTags = completedTags.filter(
              (t) => now - t.mysteryTime * 1000 > tagAutoPostTimer
            )

            if (timedOutTags.length) {
              const orderedTimedOutTags = timedOutTags.sort(
                (t1, t2) => t1.mysteryTime - t2.mysteryTime
              )
              const winnerWinnerChickenDinner = orderedTimedOutTags[0] // the "first" completed tag in the queue
              const { data: currentBikeTag } = await biketag.getTag() // the "current" mystery tag to be updated
              console.log(
                `cron: [${game.name}] game has a winning tag that was posted longer than [${autoPostSetting} minutes] ago.`,
                { winnerWinnerChickenDinner, currentBikeTag }
              )

              if (currentBikeTag.tagnumber !== winnerWinnerChickenDinner.tagnumber - 1) {
                results.push({
                  message: 'queued tag is not for the current biketag tagnumber',
                  game: game.name,
                  currentBikeTag,
                  tag: winnerWinnerChickenDinner,
                })
                errors = true
              } else {
                try {
                  if (winnerWinnerChickenDinner.discussionUrl) {
                    const discussionUrlObject = JSON.parse(winnerWinnerChickenDinner.discussionUrl)
                    if (
                      discussionUrlObject &&
                      typeof discussionUrlObject.postToReddit !== 'undefined'
                    ) {
                      /// TODO: post to Reddit and save the URL here
                      winnerWinnerChickenDinner.discussionUrl = 'redd.it/'
                    }
                  }
                  if (winnerWinnerChickenDinner.mentionUrl) {
                    const mentionUrlObject = JSON.parse(winnerWinnerChickenDinner.mentionUrl)
                    if (mentionUrlObject && typeof mentionUrlObject.postToTwitter === 'undefined') {
                      /// TODO: post to Reddit and save the URL here
                      winnerWinnerChickenDinner.mentionUrl = 'twitter.com/'
                    }
                  }
                } catch (e) {
                  winnerWinnerChickenDinner.discussionUrl =
                    winnerWinnerChickenDinner.discussionUrl?.indexOf('postToReddit') > 0
                      ? ''
                      : winnerWinnerChickenDinner.discussionUrl
                  winnerWinnerChickenDinner.mentionUrl =
                    winnerWinnerChickenDinner.mentionUrl?.indexOf('postToTwitter') > 0
                      ? ''
                      : winnerWinnerChickenDinner.mentionUrl
                }
                const newBikeTagPost =
                  BikeTagClient.getters.getOnlyMysteryTagFromTagData(winnerWinnerChickenDinner) // the new "current" mystery tag
                try {
                  /************** UPDATE CURRENT BIKETAG WITH FOUND IMAGE *****************/
                  currentBikeTag.foundImageUrl = winnerWinnerChickenDinner.foundImageUrl
                  currentBikeTag.foundTime = winnerWinnerChickenDinner.foundTime
                  currentBikeTag.foundLocation = winnerWinnerChickenDinner.foundLocation
                  currentBikeTag.foundPlayer = winnerWinnerChickenDinner.foundPlayer
                  const currentBikeTagUpdateResult = await biketag.updateTag(currentBikeTag)
                  if (currentBikeTagUpdateResult.success) {
                    results.push({
                      message: 'current BikeTag updated',
                      game: game.name,
                      tag: currentBikeTag,
                    })
                  } else {
                    results.push({
                      message: 'current BikeTag was not updated',
                      error: currentBikeTagUpdateResult.error,
                      game: game.name,
                      tag: currentBikeTag,
                    })
                    errors = true
                  }

                  /************** SET NEW BIKETAG POST FROM QUEUE *****************/
                  const newBikeTagUpdateResult = await biketag.updateTag(newBikeTagPost)
                  if (newBikeTagUpdateResult.success) {
                    results.push({
                      message: 'new BikeTag posted',
                      game: game.name,
                      tag: newBikeTagUpdateResult.data,
                    })
                  } else {
                    results.push({
                      message: 'new BikeTag was not posted',
                      error: newBikeTagUpdateResult.error,
                      game: game.name,
                      tag: newBikeTagPost,
                    })
                    errors = true
                  }

                  if (currentBikeTagUpdateResult.success && newBikeTagUpdateResult.success) {
                    const ambassadors = (await biketag.ambassadors(undefined, {
                      source: 'sanity',
                    })) as Ambassador[]
                    const thisGamesAmbassadors = ambassadors.filter(
                      (a) => game.ambassadors.indexOf(a.name) !== -1
                    )
                    const winningTagnumber = (newBikeTagUpdateResult.data as unknown as Tag)
                      .tagnumber
                    const host = `https://${game.name}.biketag.org`
                    const logo = game.logo?.length
                      ? game.logo.indexOf('imgur.co') !== -1
                        ? game.logo
                        : getSanityImageUrl(game.logo)
                      : `${host}${defaultLogo}`
                    await sendEmailsToAmbassadors(
                      'biketag-auto-posted',
                      `New BikeTag Round (#${winningTagnumber}) Auto-Posted for [${game.name}]`,
                      thisGamesAmbassadors,
                      (a) => {
                        return {
                          currentBikeTag: currentBikeTagUpdateResult.data,
                          newBikeTagPost: newBikeTagUpdateResult.data,
                          logo,
                          ambassadorsUrl: `${host}/#/queue?btaId=${a?.id}`,
                          tagAutoApprovedText:
                            'This tag was auto-approved by the AutoPost feature for being the first, completed, BikeTag Post to be submitted. If there is a problem with this tag, please click the button below to address the issue.',
                          newBikeTagRoundTitle: ``,
                          newBikeTagRoundText: `BikeTag Round #${winningTagnumber} was just auto-posted!`,
                          tosText: 'Terms & Conditions',
                          replyToRemoveLink:
                            'reply to this email to request that these emails no longer be sent to you',
                          newBikeTagRoundFooter: 'Thank you for being a BikeTag Ambassador!',
                          btaDashboardButton: 'BikeTag Ambassador dashboard',
                          host,
                          game: game.name,
                          redditLink: `https://reddit.com/r/${
                            game.subreddit?.length ? game.subreddit : 'biketag'
                          }`,
                          twitterLink: `https://twitter.com/${
                            game.twitter?.length ? game.twitter : 'biketag'
                          }`,
                          // instagramLink: `https://www.reddit.com/r/${game. ?? 'biketag'}`,
                        }
                      }
                    )

                    /************** CLEAR EXISTING QUEUE BY ARCHIVING/DELETING TAG IMAGES *****************/
                    const nonAdminBikeTagOpts = getBikeTagClientOpts(
                      {
                        ...event,
                        method: event.httpMethod,
                      } as unknown as request.Request,
                      true
                    )
                    nonAdminBikeTagOpts.game = game.name.toLocaleLowerCase()
                    nonAdminBikeTagOpts.imgur.hash = game.queuehash
                    const nonAdminBikeTag = new BikeTagClient(nonAdminBikeTagOpts)

                    if (activeQueue.length > 1) {
                      const remainingQueuedTags = activeQueue.slice(1)
                      for (const nonWinningTag of remainingQueuedTags) {
                        /* Archive using ambassador credentials (mainhash and archivehash are both ambassador albums) */
                        const archiveTagResult = await biketag.archiveTag(nonWinningTag)
                        if (archiveTagResult.success) {
                          results.push({
                            message: 'non-winning found image archived',
                            game: game.name,
                            tag: nonWinningTag,
                          })
                        } else {
                          console.log({ archiveTagResult })
                          results.push({
                            message: 'error archiving non-winning found image',
                            game: game.name,
                            tag: nonWinningTag,
                          })
                          errors = true
                        }
                        /* delete using player credentials (queuehash is player album) */
                        const deleteArchivedTagFromQueueResult = await nonAdminBikeTag.deleteTag(
                          nonWinningTag
                        )
                        if (deleteArchivedTagFromQueueResult.success) {
                          results.push({
                            message: 'non-winning tag deleted from queue',
                            game: game.name,
                            tag: nonWinningTag,
                          })
                        } else {
                          console.log({ deleteArchivedTagFromQueueResult })
                          results.push({
                            message: 'error deleting non-winning tag from the queue',
                            game: game.name,
                            tag: nonWinningTag,
                          })
                          /// No error here?
                        }
                      }
                    }

                    const deleteQueuedTagResult = await nonAdminBikeTag.deleteTag(
                      winnerWinnerChickenDinner
                    )
                    if (deleteQueuedTagResult.success) {
                      results.push({
                        message: 'winning tag deleted from queue',
                        game: game.name,
                        tag: winnerWinnerChickenDinner,
                      })
                    } else {
                      console.log({ deleteQueuedTagResult })
                      results.push({
                        message: 'error deleting winning tag from queue',
                        game: game.name,
                        tag: winnerWinnerChickenDinner,
                      })
                      errors = true
                    }
                  }
                } catch (e) {
                  results.push({
                    message: e?.message ?? e,
                    game: game.name,
                    current: currentBikeTag,
                    tag: newBikeTagPost,
                  })
                  errors = true
                }
              }
            }
          }
        }
      }
    }
  } else {
    console.log('couldnt get games', gamesResponse)
  }

  if (results.length) {
    console.log({ results })
    return {
      statusCode: errors ? 400 : 200,
      body: JSON.stringify(results),
    }
  } else {
    console.log('nothing to report')
    return {
      statusCode: errors ? 400 : 200,
      body: '',
    }
  }
}

const handler = builder(cronHandler)

export { handler }
