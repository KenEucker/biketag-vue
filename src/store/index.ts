import { InjectionKey } from 'vue'
import { createStore, Store } from 'vuex'
import BikeTagClient from 'biketag'
import { Game, Tag, Player, Setting } from 'biketag/lib/common/schema'
import {
  getDomainInfo,
  getImgurImageSized,
  getUuid,
  getBikeTagClientOpts,
  getAmbassadorUuid,
  getQueuedTagState,
} from '@/common/utils'
import { BiketagFormSteps, State } from '@/common/types'

// define injection key
export const key: InjectionKey<Store<State>> = Symbol()
const domain = getDomainInfo(window)
const playerId = getUuid()
const ambassadorId = getAmbassadorUuid(window)
const gameName = domain.subdomain ?? process.env.GAME_NAME ?? ''
const useAuth = process.env.USE_AUTHENTICATION === 'true'
const options: any = {
  game: gameName,
  host: `https://${gameName}.biketag.io/api`,
  ...getBikeTagClientOpts(window, useAuth),
}
const gameOpts = useAuth ? { source: 'sanity' } : {}
const defaultLogo = '/images/BikeTag.svg'
const defaultJingle = 'media/biketag-jingle-1.mp3'
const sanityBaseCDNUrl = `${process.env.SANITY_CDN_URL}${options.sanity?.projectId}/${options.sanity?.dataset}/`
const getSanityImageUrl = (logo: string, size = '') => {
  return `${sanityBaseCDNUrl}${logo
    .replace('image-', '')
    .replace('-png', '.png')
    .replace('-jpg', '.jpg')}${size.length ? `?${size}` : ''}`
}
console.log('store::init', { subdomain: domain.subdomain, domain, gameName, playerId })

let client = new BikeTagClient(options)

export const store = createStore<State>({
  state: {
    gameName,
    game: {} as Game,
    currentBikeTag: {} as Tag,
    tags: [] as Tag[],
    playerId,
    ambassadorId,
    queuedTags: [] as Tag[],
    players: [] as Player[],
    leaderboard: [] as Player[],
    html: '',
    formStep: BiketagFormSteps.queueView,
    queuedTag: {} as Tag,
    isBikeTagAmbassador: ambassadorId?.length > 0,
  },
  actions: {
    setGame({ commit, state }) {
      if (!state.game?.mainhash) {
        return client.game(state.gameName, gameOpts as any).then((d) => {
          const game = d as Game
          options.imgur.hash = game.mainhash
          options.imgur.queuehash = game.queuehash
          client = new BikeTagClient(options)

          return commit('SET_GAME', game)
        })
      }
    },
    setCurrentBikeTag({ commit }) {
      return client.getTag().then((r) => {
        return commit('SET_CURRENT_TAG', r.data)
      })
    },
    setTags({ commit }) {
      return client.tags().then((d) => {
        return commit('SET_TAGS', d)
      })
    },
    setQueuedTags({ commit, state }, reset) {
      if (state.currentBikeTag?.tagnumber > 0) {
        return client.queue().then((d) => {
          if ((d as Tag[])?.length > 0) {
            const currentBikeTagQueue: Tag[] = (d as Tag[]).filter(
              (t) => t.tagnumber >= state.currentBikeTag.tagnumber
            )
            const queuedTag = currentBikeTagQueue.filter((t) => t.playerId === playerId)

            if (queuedTag.length) {
              const fullyQueuedTag = queuedTag[0]
              const queuedMysteryTag = (d as Tag[]).filter(
                (t) => t.mysteryPlayer === queuedTag[0].foundPlayer
              )
              if (queuedMysteryTag.length) {
                fullyQueuedTag.mysteryImage = queuedMysteryTag[0].mysteryImage
                fullyQueuedTag.mysteryImageUrl = queuedMysteryTag[0].mysteryImageUrl
                fullyQueuedTag.mysteryPlayer = queuedMysteryTag[0].mysteryPlayer
              }
              commit('SET_QUEUED_TAG', fullyQueuedTag)
            }
            if (reset) commit('SET_FORM_STEP_TO_JOIN')

            return commit('SET_QUEUED_TAGS', currentBikeTagQueue)
          }
        })
      }

      return false
    },
    setPlayers({ commit }) {
      return client.players().then((d) => {
        return commit('SET_PLAYERS', d)
      })
    },
    setLeaderboard({ commit }) {
      return client.players({ sort: 'top', limit: 10 }).then((d) => {
        return commit('SET_LEADERBOARD', d)
      })
    },
    setQueuedTag({ commit }, d) {
      return commit('SET_QUEUED_TAG', d)
    },
    setFormStepToJoin({ commit, state }, d) {
      if (state.formStep === BiketagFormSteps.queueView || d) {
        return commit('SET_FORM_STEP_TO_JOIN', d)
      }
      return true
    },
    setFormStepToApprove({ commit, state }) {
      if (state.isBikeTagAmbassador) {
        return commit('SET_FORM_STEP_TO_APPROVE')
      }
      return false
    },
    async dequeueTag({ state }, d) {
      // Check ambassador permissions?
      if (d.ambassadorId === ambassadorId) {
        d.hash = state.game.queuehash
        return client.deleteTag(d.tag).then((t) => {
          if (t.success) {
            console.log('store::tag dequeued', d.tag)
          } else {
            console.log('error::dequeue BikeTag failed', t)
            return t.error
          }
          return t.success
        })
      }
      return false
    },
    async dequeueFoundTag({ commit, state }) {
      if (state.queuedTag?.playerId === playerId) {
        const queuedTag: any = state.queuedTag
        queuedTag.hash = state.game.queuehash
        return client.deleteTag(queuedTag).then(async (t) => {
          if (t.success) {
            console.log('store::found tag dequeued', state.queuedTag)
            await commit('SET_QUEUED_TAG', {})
            await commit('RESET_FORM_STEP_TO_FOUND')

            return true
          } else {
            console.log('error::dequeue BikeTag failed', t)
            return t.error
          }
        })
      }
    },
    async dequeueMysteryTag({ commit, state }) {
      if (state.queuedTag?.playerId === playerId) {
        const queuedFoundTag: any = BikeTagClient.getters.getOnlyFoundTagFromTagData(
          state.queuedTag
        )
        const queuedMysteryTag: any = BikeTagClient.getters.getOnlyMysteryTagFromTagData(
          state.queuedTag
        )
        queuedMysteryTag.hash = state.game.queuehash
        return client.deleteTag(queuedMysteryTag).then(async (t) => {
          if (t.success) {
            console.log('store::mystery tag dequeued')
            await commit('SET_QUEUED_TAG', queuedFoundTag)
            await commit('RESET_FORM_STEP_TO_MYSTERY')

            return true
          } else {
            console.log('error::dequeue BikeTag failed', t)
            return t.error
          }
        })
      }
    },
    async queueFoundTag({ commit }, d) {
      if (d.foundImage && !d.foundImageUrl) {
        d.playerId = playerId
        return client.queueTag(d).then((t) => {
          if (t.success) {
            commit('SET_QUEUE_FOUND', t.data)
          } else {
            console.log('error::queue (Found) BikeTag failed', t)
            return t.error
          }
          return t.success
        })
      }
      return commit('SET_QUEUE_FOUND', d)
    },
    async queueMysteryTag({ commit }, d) {
      if (d.mysteryImage && !d.mysteryImageUrl) {
        d.playerId = playerId
        return client.queueTag(d).then((t) => {
          if (t.success) {
            commit('SET_QUEUE_MYSTERY', t.data)
          } else {
            console.log('error::queue (Mystery) BikeTag failed', t)
            return t.error
          }
          return t.success
        })
      }
      return commit('SET_QUEUE_MYSTERY', d)
    },
    async submitQueuedTag({ commit }, d) {
      if (d.mysteryImageUrl && d.foundImageUrl) {
        d.playerId = playerId
        return client.queueTag(d).then((t) => {
          if (t.success) {
            commit('SET_QUEUED_SUBMITTED', t.data)
          } else {
            console.log('error::submit BikeTag failed', t)
            return t.error
          }
          return t.success
        })
      }
    },
    async resetFormStep({ commit }) {
      return commit('RESET_FORM_STEP')
    },
    async resetFormStepToFound({ commit }) {
      await commit('SET_QUEUED_TAG')
      return commit('RESET_FORM_STEP_TO_FOUND')
    },
    async resetFormStepToMystery({ commit, state }) {
      await commit('SET_QUEUED_TAG', {
        foundImage: state.queuedTag.foundImage,
        foundImageUrl: state.queuedTag.foundImageUrl,
        foundLocation: state.queuedTag.foundLocation,
        foundPlayer: state.queuedTag.foundPlayer,
        playerId: state.queuedTag.playerId,
      })
      return commit('RESET_FORM_STEP_TO_MYSTERY')
    },
    async resetFormStepToPost({ commit, state }) {
      await commit('SET_QUEUED_TAG', {
        foundImage: state.queuedTag.foundImage,
        foundImageUrl: state.queuedTag.foundImageUrl,
        foundLocation: state.queuedTag.foundLocation,
        foundPlayer: state.queuedTag.foundPlayer,
        mysteryImage: state.queuedTag.foundImage,
        playerId: state.queuedTag.playerId,
        mysteryImageUrl: state.queuedTag.foundImageUrl,
        hint: state.queuedTag.hint,
        mysteryPlayer: state.queuedTag.mysteryPlayer,
      })
      return commit('RESET_FORM_STEP_TO_POST')
    },
    async getAmbassadorPermission({ state }, d) {
      if (d.ambassadorId === ambassadorId) {
        /// TODO: check for privileges to delete?
        return true
      }
      return false
    },
  },
  mutations: {
    SET_GAME(state, game) {
      const oldState = state.game
      state.game = game

      if (oldState?.name !== game?.name) {
        console.log('store::game', { game })
      }
    },
    SET_CURRENT_TAG(state, tag) {
      const oldState = state.currentBikeTag
      state.currentBikeTag = tag

      if (oldState?.tagnumber !== tag?.tagnumber) {
        console.log('store::currentBikeTag', { tag })
      }
    },
    SET_TAGS(state, tags) {
      const oldState = state.tags
      state.tags = tags

      if (oldState?.length !== tags?.length) {
        console.log('store::tags', { tags })
      }
    },
    SET_LEADERBOARD(state, leaderboard) {
      const oldState = state.leaderboard
      state.leaderboard = leaderboard

      if (oldState?.length !== leaderboard?.length) {
        console.log('store::leaderboard', { leaderboard })
      }
    },
    SET_PLAYERS(state, players) {
      const oldState = state.players
      state.players = players

      if (oldState?.length !== players?.length) {
        console.log('store::players', { players })
      }
    },
    SET_QUEUED_TAGS(state, queuedTags) {
      const oldState = state.queuedTags
      state.queuedTags = queuedTags

      if (oldState?.length !== queuedTags?.length || queuedTags.length === 0) {
        console.log('store::queuedTags', { queuedTags })
      }
    },
    SET_QUEUE_FOUND(state, data) {
      const oldState = state.queuedTag
      state.queuedTag = BikeTagClient.createTagObject(data, state.queuedTag)

      // state.queuedTag.foundImageUrl = data.foundImageUrl
      // state.queuedTag.foundImage = data.foundImage
      // state.queuedTag.foundLocation = data.foundLocation
      // state.queuedTag.foundPlayer = data.foundPlayer
      // state.queuedTag.tagnumber = data.tagnumber
      // state.queuedTag.playerId = data.playerId

      if (
        oldState?.foundImageUrl !== data?.foundImageUrl ||
        oldState?.foundImage !== data?.foundImage ||
        oldState?.foundLocation !== data?.foundImageUrl ||
        oldState?.foundPlayer !== data?.foundPlayer ||
        oldState?.tagnumber !== data?.tagnumber ||
        /// In case of a reset to this step
        oldState?.mysteryPlayer !== data?.foundPlayer
      ) {
        console.log('store::queuedFoundTag', state.queuedTag)
        if (oldState?.mysteryPlayer !== data?.foundPlayer) {
          state.formStep = BiketagFormSteps.queueJoined
        } else {
          state.formStep = BiketagFormSteps.queueFound
        }
      }
    },
    SET_QUEUE_MYSTERY(state, data) {
      const oldState = state.queuedTag
      state.queuedTag = BikeTagClient.createTagObject(data, state.queuedTag)

      // state.queuedTag.mysteryImageUrl = data.mysteryImageUrl
      // state.queuedTag.mysteryImage = data.mysteryImage
      // state.queuedTag.hint = data.hint
      // state.queuedTag.mysteryPlayer = data.mysteryPlayer ?? state.queuedTag.foundPlayer
      // state.queuedTag.tagnumber = data.tagnumber
      // state.queuedTag.playerId = data.playerId
      // state.queuedTag.game = data.game ?? state.game.name

      if (
        oldState?.mysteryImageUrl !== data?.mysteryImageUrl ||
        oldState?.mysteryImage !== data?.mysteryImage ||
        oldState?.hint !== data?.hint ||
        oldState?.mysteryPlayer !== data?.mysteryPlayer ||
        oldState?.discussionUrl !== data?.discussionUrl ||
        oldState?.mentionUrl !== data?.mentionUrl ||
        oldState?.tagnumber !== data?.tagnumber
      ) {
        console.log('store::queuedMysteryTag', state.queuedTag)
        if (
          oldState?.discussionUrl !== data?.discussionUrl ||
          oldState?.mentionUrl !== data?.mentionUrl
        ) {
          state.formStep = BiketagFormSteps.queueSubmit
        } else {
          state.formStep = BiketagFormSteps.queueMystery
        }
      }
    },
    SET_QUEUED_SUBMITTED(state, data) {
      const oldState = state.queuedTag
      state.queuedTag.discussionUrl = data.discussionUrl
      state.queuedTag.mentionUrl = data.mentionUrl

      if (
        oldState?.discussionUrl !== data?.discussionUrl ||
        oldState?.mentionUrl !== data?.mentionUrl
      ) {
        console.log('store::submittedTag', state.queuedTag)
        state.formStep = BiketagFormSteps.queuePosted
      }
    },
    SET_QUEUED_TAG(state, data?: any) {
      const oldState = state.queuedTag
      state.queuedTag = BikeTagClient.createTagObject(data, data ? state.queuedTag : {})

      if (
        oldState?.mysteryImageUrl !== data?.mysteryImageUrl ||
        oldState?.mysteryImage !== data?.mysteryImage ||
        oldState?.hint !== data?.hint ||
        oldState?.mysteryPlayer !== data?.mysteryPlayer ||
        oldState?.foundImageUrl !== data?.foundImageUrl ||
        oldState?.foundImage !== data?.foundImage ||
        oldState?.foundLocation !== data?.foundImageUrl ||
        oldState?.foundPlayer !== data?.foundPlayer ||
        oldState?.discussionUrl !== data?.discussionUrl ||
        oldState?.mentionUrl !== data?.mentionUrl ||
        oldState?.tagnumber !== data?.tagnumber
      ) {
        console.log('store::queuedTag', state.queuedTag)
      }
    },
    SET_FORM_STEP_TO_JOIN(state, force) {
      const setQueudState = state.formStep !== BiketagFormSteps.queueJoined || force
      const oldState = state.formStep
      if (setQueudState && state.queuedTag) {
        state.formStep = getQueuedTagState(state.queuedTag)
      } else {
        state.formStep = BiketagFormSteps.queueJoined
      }

      if (oldState !== state.formStep) {
        console.log('state::queue', BiketagFormSteps[state.formStep])
      }
    },
    RESET_FORM_STEP(state) {
      state.formStep =
        state.queuedTags?.length > 0 ? BiketagFormSteps.queueView : BiketagFormSteps.queueFound
      // console.log('state::queue', BiketagFormSteps[state.formStep])
    },
    RESET_FORM_STEP_TO_FOUND(state) {
      state.formStep = BiketagFormSteps.queueFound
      // console.log('state::queue', BiketagFormSteps[state.formStep])
    },
    RESET_FORM_STEP_TO_MYSTERY(state) {
      state.formStep = BiketagFormSteps.queueMystery
      // console.log('state::queue', BiketagFormSteps[state.formStep])
    },
    SET_FORM_STEP_TO_APPROVE(state) {
      state.formStep = BiketagFormSteps.queueApprove
      console.log('state::queue', BiketagFormSteps[state.formStep])
    },
  },
  getters: {
    getImgurImageSized: () => getImgurImageSized,
    getQueuedTagState: (state) => {
      return getQueuedTagState(state.queuedTag)
    },
    getGame(state) {
      return state.game
    },
    getGameSlug(state) {
      return state.game?.slug
    },
    getPlayerId(state) {
      return state.playerId
    },
    getAmbassadorId(state) {
      return state.ambassadorId
    },
    getGameSettings(state) {
      return state.game?.settings
    },
    getEasterEgg(state) {
      if (state.game?.settings) {
        const jingle = state.game?.settings['easter::jingle']
        if (jingle) {
          return `https://biketag.org/public/${jingle}`
        }
      }

      return `https://biketag.org/public/${defaultJingle}`
    },
    getGameTitle(state) {
      return `${state.gameName.toUpperCase()}.BIKETAG`
    },
    getGameName(state) {
      return state.gameName
    },
    getLogoUrl(state) {
      return (size = '') => {
        const logoUrl =
          state.game?.logo?.indexOf('imgur.com') !== -1
            ? state.game.logo
            : getSanityImageUrl(state.game.logo, size)
        return logoUrl ? logoUrl : Promise.resolve(defaultLogo)
      }
    },
    getCurrentHint(state) {
      return state.currentBikeTag?.hint
    },
    getCurrentBikeTag(state) {
      return state.currentBikeTag
    },
    getTags(state) {
      return state.tags
    },
    getQueuedTags(state) {
      return state.queuedTags
    },
    getPlayers(state) {
      return state.players
    },
    getLeaderboard(state) {
      return state.leaderboard
    },
    getFormStep(state) {
      return BiketagFormSteps[state.formStep]
    },
    getQueuedTag(state) {
      return state.queuedTag
    },
  },
  modules: {},
})
