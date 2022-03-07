import { InjectionKey } from 'vue'
import { createStore, Store } from 'vuex'
import BikeTagClient from 'biketag'
import { Game, Tag, Player } from 'biketag/lib/common/schema'
import {
  getDomainInfo,
  getImgurImageSized,
  getProfileFromCookie,
  getBikeTagClientOpts,
  getQueuedTagState,
  getSanityImageUrl,
  getMostRecentlyViewedBikeTagTagnumber,
  getApiUrl,
  setProfileCookie,
  getBikeTagHash,
  setQueuedTagInCookie,
  getQueuedTagFromCookie,
} from '@/common/utils'
import { BiketagFormSteps, State } from '@/common/types'

// define injection key
/// TODO: move these initializers to a method for FE use only
export const key: InjectionKey<Store<State>> = Symbol()
const domain = getDomainInfo(window)
const profile = getProfileFromCookie()
const mostRecentlyViewedTagnumber = getMostRecentlyViewedBikeTagTagnumber(0)
const gameName = domain.subdomain ?? process.env.GAME_NAME ?? ''
const useAuth = process.env.USE_AUTHENTICATION === 'true'
/// TODO: move these options to a method for FE use only
const options: any = {
  biketag: {
    host: process.env.CONTEXT === 'dev' ? getApiUrl() : `https://${gameName}.biketag.io/api`,
    game: gameName,
    clientKey: getBikeTagHash(window.location.hostname),
    clientToken: process.env.ACCESS_TOKEN,
  },
  ...getBikeTagClientOpts(window, useAuth),
}
const gameOpts = useAuth ? { source: 'sanity' } : {}
/// TODO: move these constants to common
const defaultLogo = '/images/BikeTag.svg'
const defaultJingle = 'media/biketag-jingle-1.mp3'
const sanityBaseCDNUrl = `${process.env.SANITY_CDN_URL}${options.sanity?.projectId}/${options.sanity?.dataset}/`

console.log('init::store', {
  subdomain: domain.subdomain,
  domain,
  gameName,
  profile,
})

/// TODO: create a helper for the instantiation of the biketag client (use singleton?)
let client = new BikeTagClient(options)

export const store = createStore<State>({
  state: {
    dataInitialized: false,
    gameName,
    game: {} as Game,
    allGames: [] as Game[],
    currentBikeTag: {} as Tag,
    tags: [] as Tag[],
    queuedTags: [] as Tag[],
    players: [] as Player[],
    leaderboard: [] as Player[],
    html: '',
    formStep: BiketagFormSteps.queueView,
    queuedTag: getQueuedTagFromCookie() ?? ({} as Tag),
    profile,
    isBikeTagAmbassador: profile.isBikeTagAmbassador ? true : false,
    mostRecentlyViewedTagnumber,
    credentialsFetched: false,
  },
  actions: {
    async fetchCredentials({ state }) {
      if (!state.credentialsFetched) {
        const credentials = await client.fetchCredentials()
        console.log({ credentials })
        await client.config(credentials, false, true)
        state.credentialsFetched = true
      }
    },
    async setProfile({ commit }, profile) {
      /// Call to backend api GET on /profile with authorization header
      if (profile) {
        const token = profile.token
        profile.token = undefined

        const response = await client.plainRequest({
          method: 'GET',
          url: getApiUrl('profile'),
          headers: {
            authorization: `Bearer ${token}`,
          },
        })
        if (response.status == 200) {
          if (typeof response.data === 'string') {
            const biketagProfile = JSON.parse(response.data)
            return commit('SET_PROFILE', biketagProfile)
          } else if (typeof response.data === 'object') {
            return commit('SET_PROFILE', response.data)
          }
        }
      }

      return commit('SET_PROFILE', profile)
    },
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

      return false
    },
    setAllGames({ commit }) {
      const biketagClient = new BikeTagClient({ ...options, game: undefined })
      return biketagClient
        .getGame(undefined, {
          source: 'sanity',
        })
        .then((d) => {
          if (d.success) {
            const games = d.data as unknown as Game[]
            const supportedGames = games.filter(
              (g: Game) =>
                g.mainhash?.length && g.archivehash?.length && g.queuehash?.length && g.logo?.length
            )
            return commit('SET_ALL_GAMES', supportedGames)
          }

          return false
        })
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
            const queuedTag = currentBikeTagQueue.filter((t) => t.playerId === state.profile.sub)

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

          return false
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
    setDataInitialized({ commit }) {
      return commit('SET_DATA_INITIALIZED')
    },
    async approveTag({ state }, d) {
      if (state.isBikeTagAmbassador) {
        d.hash = state.game.queuehash
        return client.deleteTag(d.tag).then((t) => {
          if (t.success) {
            console.log('store::tag dequeued', d.tag)
          } else {
            console.log('error::dequeue BikeTag failed', t)
            return t.error
          }
          return 'successfully dequeued tag'
        })
      }
      return 'incorrect permissions'
    },
    async dequeueTag({ state }, d) {
      if (state.isBikeTagAmbassador) {
        d.hash = state.game.queuehash
        return client.deleteTag(d).then((t) => {
          console.log({ t })
          if (t.success) {
            console.log('store::tag dequeued', d)
          } else {
            console.log('error::dequeue BikeTag failed', t)
            return t.error ? t.error : Array.isArray(t.data) ? t.data.join(' - ') : t.data
          }
          return 'successfully dequeued tag'
        })
      }
      return 'incorrect permissions'
    },
    async assignName({ commit }, profile) {
      await client.plainRequest({
        method: 'PUT',
        url: getApiUrl('profile'),
        headers: {
          authorization: `Bearer ${profile.token}`,
          'content-type': 'application/json',
        },
        data: { user_metadata: { name: profile.user_metadata.name } },
      })
      return commit('SET_PROFILE', profile)
    },
    async updateProfile({ commit, state }, profile) {
      // Update Auth0 Profile
      profile.name = state.profile.name
      const user_metadata = profile.user_metadata
      delete user_metadata.name
      const updatedProfileResponse = await client.plainRequest({
        method: 'PATCH',
        url: getApiUrl('profile'),
        headers: {
          authorization: `Bearer ${profile.token}`,
          'content-type': 'application/json',
        },
        data: { user_metadata },
      })

      return commit('SET_PROFILE', updatedProfileResponse.data)
    },
    async dequeueFoundTag({ commit, state }) {
      if (state.queuedTag?.playerId === state.profile.sub) {
        const queuedTag: any = state.queuedTag
        queuedTag.hash = state.game.queuehash
        return client.deleteTag(queuedTag).then(async (t) => {
          if (t.success) {
            console.log('store::found tag dequeued', state.queuedTag)
            await commit('SET_QUEUED_TAG', {})
            await commit('RESET_FORM_STEP_TO_FOUND')

            return true
          } else {
            return t.error ? t.error : Array.isArray(t.data) ? t.data.join(' - ') : t.data
          }
        })
      }

      return false
    },
    async dequeueMysteryTag({ commit, state }) {
      if (state.queuedTag?.playerId === state.profile.sub) {
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
    async queueFoundTag({ commit, state }, d) {
      if (d.foundImage && !d.foundImageUrl) {
        d.playerId = state.profile.sub
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
    async queueMysteryTag({ commit, state }, d) {
      if (d.mysteryImage && !d.mysteryImageUrl) {
        d.playerId = state.profile.sub
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
    async submitQueuedTag({ commit, state }, d) {
      if (d.mysteryImageUrl && d.foundImageUrl) {
        d.playerId = state.profile.sub
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
      return false
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
    async getAmbassadorPermission({ state }) {
      return state.profile?.isBikeTagAmbassador
    },
  },
  mutations: {
    SET_DATA_INITIALIZED(state) {
      state.dataInitialized = true
    },
    SET_PROFILE(state, profile) {
      const oldState = state.profile
      state.profile = profile
      state.isBikeTagAmbassador = profile?.isBikeTagAmbassador
      setProfileCookie(profile)

      if (!profile) {
        setQueuedTagInCookie()
      }

      if (
        profile?.name !== oldState?.name ||
        profile?.isBikeTagAmbassador !== oldState?.isBikeTagAmbassador
      ) {
        console.log('state::profile', profile)
      }
    },
    SET_GAME(state, game) {
      const oldState = state.game
      state.game = game

      if (oldState?.name !== game?.name) {
        console.log('store::game', { game })
      }
    },
    SET_ALL_GAMES(state, allGames) {
      const oldState = state.allGames
      state.allGames = allGames

      if (oldState?.length !== allGames?.length) {
        console.log('store::allGames', { allGames })
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
      setQueuedTagInCookie(state.queuedTag)

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
      setQueuedTagInCookie(state.queuedTag)

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
          state.formStep = BiketagFormSteps.queuePostedShare
        } else {
          state.formStep = BiketagFormSteps.queueMystery
        }
      }
    },
    SET_QUEUED_SUBMITTED(state, data) {
      const oldState = state.queuedTag
      state.queuedTag.discussionUrl = data.discussionUrl
      state.queuedTag.mentionUrl = data.mentionUrl
      setQueuedTagInCookie(state.queuedTag)

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
      setQueuedTagInCookie(data ? state.queuedTag : undefined)

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
      const setQueudState =
        (state.formStep !== BiketagFormSteps.queueJoined &&
          state.formStep !== BiketagFormSteps.queueApprove) ||
        force
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
  },
  getters: {
    getAmbassadorId(state) {
      if (state.isBikeTagAmbassador) {
        return state.profile.sub
      }
      return null
    },
    getImgurImageSized: () => getImgurImageSized,
    getQueuedTagState: (state) => {
      return getQueuedTagState(state.queuedTag)
    },
    getGame(state) {
      return state.game
    },
    getAllGames(state) {
      return state.allGames
    },
    getGameSlug(state) {
      return state.game?.slug
    },
    getPlayerId(state) {
      return state.profile.sub
    },
    getGameBoundary(state) {
      return state.game?.boundary
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
      return (size = '', logo?: string) => {
        logo = logo ? logo : state.game?.logo?.length ? state.game?.logo : undefined

        if (!logo) {
          return defaultLogo
        }

        return logo.indexOf('imgur.com') !== -1
          ? logo
          : getSanityImageUrl(logo, size, sanityBaseCDNUrl)
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
    getMostRecentlyViewedTagnumber(state) {
      return getMostRecentlyViewedBikeTagTagnumber(state.currentBikeTag.tagnumber)
    },
    getProfile(state) {
      return state.profile
    },
    isDataInitialized(state) {
      return state.dataInitialized
    },
    isBikeTagAmbassador(state) {
      return state.isBikeTagAmbassador
    },
  },
  modules: {},
})
