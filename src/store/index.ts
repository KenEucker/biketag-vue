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
  // setQueuedTagInCookie,
  // getQueuedTagFromCookie,
} from '@/common/utils'
import { BiketagFormSteps, State } from '@/common/types'
import { setNPAuthorization } from '@/common/utils'
import { debug } from '../common/utils'

// define injection key
/// TODO: move these initializers to a method for FE use only
export const key: InjectionKey<Store<State>> = Symbol()
const domain = getDomainInfo(window)
const profile = getProfileFromCookie()
const mostRecentlyViewedTagnumber = getMostRecentlyViewedBikeTagTagnumber(0)
const gameName = domain.subdomain ?? process.env.GAME_NAME ?? ''
/// TODO: move these options to a method for FE use only
const options: any = {
  // biketag: {
  host: process.env.CONTEXT === 'dev' ? getApiUrl() : `https://${gameName}.biketag.org/api`,
  // game: gameName,
  clientKey: getBikeTagHash(window.location.hostname),
  clientToken: process.env.ACCESS_TOKEN,
  // },
  ...getBikeTagClientOpts(window),
}
const gameOpts = { source: 'sanity' }
/// TODO: move these constants to common
const defaultLogo = '/images/BikeTag.svg'
const defaultJingle = 'media/biketag-jingle-1.mp3'
const sanityBaseCDNUrl = `${process.env.S_CURL}${options.sanity?.projectId}/${options.sanity?.dataset}/`

debug('init::store', {
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
    tagsInRound: [] as Tag[],
    players: [] as Player[],
    leaderboard: [] as Player[],
    html: '',
    formStep: BiketagFormSteps.addFoundImage,
    // queuedTag: getQueuedTagFromCookie() ?? ({} as Tag),
    playerTag: {} as Tag,
    profile,
    mostRecentlyViewedTagnumber,
    credentialsFetched: false,
  },
  actions: {
    // eslint-disable-next-line no-empty-pattern
    async getRegionPolygon({}, region) {
      try {
        console.log({ zip: region.zipcode })
        const firstOfRegion = region.description.split(',')[0].toLowerCase()
        const results = (
          await client.plainRequest({
            method: 'GET',
            url: 'https://nominatim.openstreetmap.org/search.php',
            params: {
              q: region.description,
              postalcode: region.zipcode,
              polygon_geojson: 1,
              format: 'json',
            },
          })
        ).data
        const filteredResults = results.filter(
          (v: any) =>
            v?.type == 'administrative' ||
            (v?.type == 'city' &&
              v?.geojson?.coordinates?.length &&
              v?.geojson.coordinates[0].length > 1)
        )
        const sortedResults = filteredResults.sort((v1: any, v2: any) => {
          if (v2?.display_name.toLowerCase().indexOf(firstOfRegion) === 0) {
            return 1
          } else if (v1?.geojson?.type === 'Polygon' || v1?.geojson?.type === 'MultiPolygon') {
            return -1
          }
          return 0
        })
        console.log({ results, filteredResults, sortedResults })
        return sortedResults[0]
      } catch (e) {
        console.log('map cannot continue')
        console.error(e)
      }
    },
    async fetchCredentials({ state }) {
      if (!state.credentialsFetched) {
        const credentials = await client.fetchCredentials()
        await client.config(credentials, false, true)
        state.credentialsFetched = true
        // if (state.profile?.isBikeTagAmbassador) {
        //   /// fetch auth token for admin purposes
        //   const checkAuth = () => {
        //     if (this.$auth?.isAuthenticated) {
        //       if (!this.getProfile?.nonce?.length) {
        //         this.$auth.getIdTokenClaims().then((claims) => {
        //           if (claims) {
        //             const token = claims.__raw
        //             this.$store.dispatch('setProfile', { ...this.$auth.user, token })
        //           } else {
        //             debug("what's this? no speaka da mda5hash, brah?")
        //           }
        //         })
        //       }
        //       return true
        //     }
        //     return false
        //   }
        // }
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
    async setGame({ commit, state }) {
      if (!state.game?.mainhash) {
        return client.game(state.gameName, gameOpts as any).then(async (d) => {
          if (d) {
            const game = d as Game
            options.imgur.hash = game.mainhash
            options.imgur.queuehash = game.queuehash
            client = new BikeTagClient(options)

            await commit('SET_GAME', game)
            return game
          }
          return false
        })
      }
    },
    setAllGames({ commit }) {
      const biketagClient = new BikeTagClient({ ...options, game: undefined })
      return biketagClient
        .getGame(
          { game: '' },
          {
            source: 'sanity',
          }
        )
        .then((d) => {
          if (d.success) {
            const games = d.data as unknown as Game[]
            const supportedGames = games.filter(
              (g: Game) =>
                g.mainhash?.length && g.archivehash?.length && g.queuehash?.length && g.logo?.length
            )
            console.log({ setAllGames: supportedGames, games })
            return commit('SET_ALL_GAMES', supportedGames)
          }

          return false
        })
    },
    setCurrentBikeTag({ commit }, cached = true) {
      return client.getTag(undefined, { cached }).then((r) => {
        return commit('SET_CURRENT_TAG', r.data)
      })
    },
    setTags({ commit }, cached = true) {
      return client.tags(undefined, { cached }).then((d) => {
        return commit('SET_TAGS', d)
      })
    },
    setQueuedTags({ commit, state }, cached = true) {
      if (state.currentBikeTag?.tagnumber > 0) {
        return client.queue(undefined, { cached }).then((d) => {
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
              commit('SET_QUEUED_TAG_STATE', fullyQueuedTag)
            }

            return commit('SET_QUEUED_TAGS', currentBikeTagQueue)
          }

          return false
        })
      }

      return false
    },
    setPlayers({ commit }, cached = true) {
      return client.players(undefined, { cached }).then((d) => {
        return commit('SET_PLAYERS', d)
      })
    },
    setLeaderboard({ commit }, cached = true) {
      return client.players({ sort: 'top', limit: 10 }, { cached }).then((d) => {
        return commit('SET_LEADERBOARD', d)
      })
    },
    setQueuedTag({ commit }, d) {
      return commit('SET_QUEUED_TAG', d)
    },
    setFormStepToJoin({ commit, state }, d) {
      if (state.formStep === BiketagFormSteps.viewRound || d) {
        return commit('SET_FORM_STEP_TO_JOIN', d)
      }
      return true
    },
    setDataInitialized({ commit }) {
      return commit('SET_DATA_INITIALIZED')
    },
    async approveTag({ state }, d) {
      if (state.profile?.isBikeTagAmbassador) {
        d.hash = state.game.queuehash
        const token = d.token
        d.token = undefined
        try {
          const approveTagResponse = await client.plainRequest({
            method: 'POST',
            url: getApiUrl('approve'),
            data: { tag: d, ambassadorId: state.profile.sub },
            headers: {
              authorization: `Bearer ${token}`,
            },
          })
          if (approveTagResponse.status === 202) {
            return true
          } else if (approveTagResponse.status === 200) {
            return `BikeTag round #${d.tagnumber} couldn't be posted`
          }
        } catch (e: any) {
          console.error('error approving tag', e?.message ?? e)
          return 'error approving tag'
        }
      }

      return 'incorrect permissions'
    },
    async dequeueTag({ state }, d) {
      if (state.profile?.isBikeTagAmbassador) {
        d.hash = state.game.queuehash
        return client.deleteTag(d).then((t) => {
          if (t.success) {
            debug('store::tag dequeued', d)
          } else {
            debug('error::dequeue BikeTag failed', t)
            return t.error ? t.error : Array.isArray(t.data) ? t.data.join(' - ') : t.data
          }
          return true
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
    // eslint-disable-next-line no-empty-pattern
    async checkPasscode({}, { name, passcode }) {
      return await client.plainRequest({
        method: 'GET',
        url: getApiUrl('profile'),
        headers: {
          authorization: `Basic ${setNPAuthorization(`${name}::${passcode}`)}`,
        },
      })
    },
    // eslint-disable-next-line no-empty-pattern
    async getUserSocial({}, name) {
      return await client.plainRequest({
        method: 'GET',
        url: getApiUrl('profile'),
        params: {
          name,
        },
      })
    },
    async dequeueFoundTag({ commit, state }) {
      if (state.playerTag?.playerId === state.profile.sub) {
        const queuedTag: any = state.playerTag
        queuedTag.hash = state.game.queuehash
        return client.deleteTag(queuedTag).then(async (t) => {
          if (t.success) {
            debug('store::found tag dequeued', state.playerTag)
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
      if (state.playerTag?.playerId === state.profile.sub) {
        const queuedFoundTag: any = BikeTagClient.getters.getOnlyFoundTagFromTagData(
          state.playerTag
        )
        const queuedMysteryTag: any = BikeTagClient.getters.getOnlyMysteryTagFromTagData(
          state.playerTag
        )
        queuedMysteryTag.hash = state.game.queuehash
        return client.deleteTag(queuedMysteryTag).then(async (t) => {
          if (t.success) {
            debug('store::mystery tag dequeued')
            await commit('SET_QUEUED_TAG', queuedFoundTag)
            await commit('RESET_FORM_STEP_TO_MYSTERY')

            return true
          } else {
            debug('error::dequeue BikeTag failed', t)
            return t.error
          }
        })
      }
    },
    async addFoundTag({ commit, state }, d) {
      if (d.foundImage && !d.foundImageUrl) {
        d.playerId = state.profile.sub
        return client.queueTag(d).then((t) => {
          if (t.success) {
            commit('SET_QUEUE_FOUND', t.data)
          } else {
            debug('error::queue (Found) BikeTag failed', t)
            return t.error
          }
          return t.success
        })
      }
      return commit('SET_QUEUE_FOUND', d)
    },
    async addMysteryTag({ commit, state }, d) {
      if (d.mysteryImage && !d.mysteryImageUrl) {
        d.playerId = state.profile.sub

        return client.queueTag(d).then((t) => {
          if (t.success) {
            commit('SET_QUEUE_MYSTERY', t.data)
          } else {
            debug('error::queue (Mystery) BikeTag failed', t)
            return t.error
          }
          return t.success
        })
      }
      return commit('SET_QUEUE_MYSTERY', d)
    },
    async postNewBikeTag({ commit, state }, d) {
      if (d.mysteryImageUrl && d.foundImageUrl) {
        d.playerId = state.profile.sub
        return client.queueTag(d).then((t) => {
          if (t.success) {
            commit('SET_QUEUED_SUBMITTED', t.data)
          } else {
            debug('error::submit BikeTag failed', t)
            return t.error
          }
          return t.success
        })
      }
      return false
    },
    // async resetFormStep({ commit }) {
    //   return commit('RESET_FORM_STEP')
    // },
    async resetFormStepToFound({ commit }) {
      await commit('SET_QUEUED_TAG')
      return commit('RESET_FORM_STEP_TO_FOUND')
    },
    async resetFormStepToMystery({ commit, state }) {
      await commit('SET_QUEUED_TAG', {
        foundImage: state.playerTag.foundImage,
        foundImageUrl: state.playerTag.foundImageUrl,
        foundLocation: state.playerTag.foundLocation,
        foundPlayer: state.playerTag.foundPlayer,
        playerId: state.playerTag.playerId,
      })
      return commit('RESET_FORM_STEP_TO_MYSTERY')
    },
    async resetFormStepToPost({ commit, state }) {
      await commit('SET_QUEUED_TAG', {
        foundImage: state.playerTag.foundImage,
        foundImageUrl: state.playerTag.foundImageUrl,
        foundLocation: state.playerTag.foundLocation,
        foundPlayer: state.playerTag.foundPlayer,
        mysteryImage: state.playerTag.foundImage,
        playerId: state.playerTag.playerId,
        mysteryImageUrl: state.playerTag.foundImageUrl,
        hint: state.playerTag.hint,
        mysteryPlayer: state.playerTag.mysteryPlayer,
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
      console.trace('stale::profile', profile)
      setProfileCookie(profile)

      if (!profile) {
        // setQueuedTagInCookie()
      }

      if (
        profile?.name !== oldState?.name ||
        profile?.isBikeTagAmbassador !== oldState?.isBikeTagAmbassador
      ) {
        debug('state::profile', profile)
      }
    },
    SET_GAME(state, game) {
      const oldState = state.game
      state.game = game

      if (oldState?.name !== game?.name) {
        debug('store::game', { game })
      }
    },
    SET_ALL_GAMES(state, allGames) {
      const oldState = state.allGames
      state.allGames = allGames

      if (oldState?.length !== allGames?.length) {
        debug('store::allGames', { allGames })
      }
    },
    SET_CURRENT_TAG(state, tag) {
      const oldState = state.currentBikeTag
      state.currentBikeTag = tag

      if (oldState?.tagnumber !== tag?.tagnumber) {
        debug('store::currentBikeTag', { tag })
      }
    },
    SET_TAGS(state, tags) {
      const oldState = state.tags
      state.tags = tags

      if (oldState?.length !== tags?.length) {
        debug('store::tags', { tags })
      }
    },
    SET_LEADERBOARD(state, leaderboard) {
      const oldState = state.leaderboard
      state.leaderboard = leaderboard

      if (oldState?.length !== leaderboard?.length) {
        debug('store::leaderboard', { leaderboard })
      }
    },
    SET_PLAYERS(state, players) {
      const oldState = state.players
      state.players = players

      if (oldState?.length !== players?.length) {
        debug('store::players', { players })
      }
    },
    SET_QUEUED_TAGS(state, queuedTags) {
      const oldState = state.tagsInRound
      state.tagsInRound = queuedTags

      if (oldState?.length !== queuedTags?.length || queuedTags.length === 0) {
        debug('store::queuedTags', { queuedTags })
      }
    },
    SET_QUEUE_FOUND(state, data) {
      const oldState = state.playerTag
      state.playerTag = BikeTagClient.createTagObject(data, state.playerTag)
      // setQueuedTagInCookie(state.queuedTag)

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
        debug('store::queuedFoundTag', state.playerTag)
        if (oldState?.mysteryPlayer !== data?.foundPlayer) {
          state.formStep = BiketagFormSteps.roundJoined
        } else {
          state.formStep = BiketagFormSteps.addFoundImage
        }
      }
    },
    SET_QUEUE_MYSTERY(state, data) {
      const oldState = state.playerTag
      state.playerTag = BikeTagClient.createTagObject(data, state.playerTag)
      // setQueuedTagInCookie(state.queuedTag)

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
        debug('store::queuedMysteryTag', state.playerTag)
        if (
          oldState?.discussionUrl !== data?.discussionUrl ||
          oldState?.mentionUrl !== data?.mentionUrl
        ) {
          state.formStep = BiketagFormSteps.roundPosted
        } else {
          state.formStep = BiketagFormSteps.addMysteryImage
        }
      }
    },
    SET_QUEUED_SUBMITTED(state, data) {
      const oldState = state.playerTag
      state.playerTag.discussionUrl = data.discussionUrl
      state.playerTag.mentionUrl = data.mentionUrl
      // setQueuedTagInCookie(state.queuedTag)

      if (
        oldState?.discussionUrl !== data?.discussionUrl ||
        oldState?.mentionUrl !== data?.mentionUrl
      ) {
        debug('store::submittedTag', state.playerTag)
        state.formStep = BiketagFormSteps.roundPosted
      }
    },
    SET_QUEUED_TAG(state, data?: any) {
      const oldState = state.playerTag
      state.playerTag = BikeTagClient.createTagObject(data, data ? state.playerTag : {})
      // setQueuedTagInCookie(data ? state.queuedTag : undefined)

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
        debug('store::queuedTag', state.playerTag)
      }
    },
    SET_FORM_STEP_TO_JOIN(state, force) {
      const setQueudState = state.formStep !== BiketagFormSteps.roundJoined || force
      const oldState = state.formStep
      if (setQueudState && state.playerTag) {
        state.formStep = getQueuedTagState(state.playerTag)
      } else {
        state.formStep = BiketagFormSteps.roundJoined
      }

      if (oldState !== state.formStep) {
        debug('state::queue', BiketagFormSteps[state.formStep])
      }
    },
    SET_QUEUED_TAG_STATE(state, tag) {
      state.formStep = getQueuedTagState(tag ?? this.queuedTag)
    },
    // RESET_FORM_STEP(state) {
    //   state.formStep =
    //     state.queuedTags?.length > 0 ? BiketagFormSteps.viewRound : BiketagFormSteps.addFoundImage
    //   debug('state::queue', BiketagFormSteps[state.formStep])
    // },
    RESET_FORM_STEP_TO_FOUND(state) {
      state.formStep = BiketagFormSteps.addFoundImage
      // debug('state::queue', BiketagFormSteps[state.formStep])
    },
    RESET_FORM_STEP_TO_MYSTERY(state) {
      state.formStep = BiketagFormSteps.addMysteryImage
      // debug('state::queue', BiketagFormSteps[state.formStep])
    },
  },
  getters: {
    getAmbassadorId(state) {
      if (state.profile?.isBikeTagAmbassador) {
        return state.profile.sub
      }
      return null
    },
    getImgurImageSized: () => getImgurImageSized,
    getQueuedTagState: (state) => {
      return getQueuedTagState(state.playerTag)
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
          return `https://biketag.org/${jingle}`
        }
      }

      return `https://biketag.org/${defaultJingle}`
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
      return state.tagsInRound
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
    getPlayerTag(state) {
      return state.playerTag
    },
    getMostRecentlyViewedTagnumber(state) {
      return getMostRecentlyViewedBikeTagTagnumber(state.currentBikeTag?.tagnumber)
    },
    getProfile(state) {
      return state.profile
    },
    isDataInitialized(state) {
      return state.dataInitialized
    },
    isBikeTagAmbassador(state) {
      return state.profile?.isBikeTagAmbassador
    },
  },
  modules: {},
})
