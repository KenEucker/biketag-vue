import { BiketagFormSteps, State } from '@/common/types'
import {
  getApiUrl,
  getBikeTagClientOpts,
  getBikeTagHash,
  getDomainInfo,
  getImgurImageSized,
  getMostRecentlyViewedBikeTagTagnumber,
  getProfileFromCookie,
  getQueuedTagState,
  getSanityImageUrl,
  setNPAuthorization,
  setProfileCookie,
} from '@/common/utils'
import BikeTagClient from 'biketag'
import { Game, Player, Tag } from 'biketag/lib/common/schema'
import { createPinia, defineStore } from 'pinia'
import { debug } from '../common/utils'
// import { inject } from 'vue'

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

export const store = createPinia()
export const useStore = defineStore('store', {
  state: (): State => ({
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
  }),
  actions: {
    // eslint-disable-next-line no-empty-pattern
    async getRegionPolygon(region: any) {
      try {
        const firstOfRegion = region.description.split(',')[0].toLowerCase()
        const results = (
          await client.plainRequest({
            method: 'GET',
            url: 'https://nominatim.openstreetmap.org/search',
            params: {
              q: region.description,
              // postalcode: region.zipcode,
              polygon_geojson: 1,
              format: 'json',
            },
          })
        ).data
        const filteredResults = results.filter(
          (v: any) =>
            v?.type == 'administrative' ||
            v?.type == 'postcode' ||
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
        // console.log({ region, firstOfRegion, results, filteredResults, sortedResults })
        return sortedResults[0]
      } catch (e) {
        console.log('map cannot continue')
        console.error(e)
      }
    },
    async fetchCredentials() {
      if (!this.credentialsFetched) {
        const credentials = await client.fetchCredentials()
        await client.config(credentials, false, true)
        this.credentialsFetched = true
        // if (this.profile?.isBikeTagAmbassador) {
        //   const auth = inject('auth0')
        //   /// fetch auth token for admin purposes
        //   const checkAuth = () => {
        //     if (auth?.isAuthenticated) {
        //       if (!this.getProfile?.nonce?.length) {
        //         auth.getIdTokenClaims().then((claims) => {
        //           if (claims) {
        //             const token = claims.__raw
        //             this.$store.dispatch('setProfile', { ...auth.user, token })
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
    async setProfile(profile: any) {
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
            return this.SET_PROFILE(biketagProfile)
          } else if (typeof response.data === 'object') {
            return this.SET_PROFILE(response.data)
          }
        }
      }

      return this.SET_PROFILE(profile)
    },
    async setGame() {
      if (!this.game?.mainhash) {
        return client.game(this.gameName, gameOpts as any).then(async (d) => {
          if (d) {
            const game = d as Game
            options.imgur.hash = game.mainhash
            options.imgur.queuehash = game.queuehash
            client = new BikeTagClient(options)

            this.SET_GAME(game)
            return game
          }
          return false
        })
      }
    },
    setAllGames() {
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
            // console.log({ setAllGames: supportedGames, games })
            return this.SET_ALL_GAMES(supportedGames)
          }

          return false
        })
    },
    setCurrentBikeTag(cached = true) {
      return client.getTag(undefined, { cached }).then((r) => {
        return this.SET_CURRENT_TAG(r.data)
      })
    },
    setTags(cached = true) {
      return client.tags(undefined, { cached }).then((d) => {
        return this.SET_TAGS(d)
      })
    },
    setQueuedTags(cached = true) {
      if (this.currentBikeTag?.tagnumber > 0) {
        return client.queue(undefined, { cached }).then((d) => {
          if ((d as Tag[])?.length > 0) {
            const currentBikeTagQueue: Tag[] = (d as Tag[]).filter(
              (t) => t.tagnumber >= this.currentBikeTag.tagnumber
            )
            const queuedTag = currentBikeTagQueue.filter((t) => t.playerId === this.profile.sub)

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
              this.SET_QUEUED_TAG(fullyQueuedTag)
              this.SET_QUEUED_TAG_STATE(fullyQueuedTag)
            }

            return this.SET_QUEUED_TAGS(currentBikeTagQueue)
          }

          return false
        })
      }

      return false
    },
    setPlayers(cached = true) {
      return client.players(undefined, { cached }).then((d) => {
        return this.SET_PLAYERS(d)
      })
    },
    setLeaderboard(cached = true) {
      return client.players({ sort: 'top', limit: 10 }, { cached }).then((d) => {
        return this.SET_LEADERBOARD(d)
      })
    },
    setQueuedTag(d: any) {
      return this.SET_QUEUED_TAG(d)
    },
    setFormStepToJoin(d: any) {
      if (this.formStep === BiketagFormSteps.viewRound || d) {
        return this.SET_FORM_STEP_TO_JOIN(d)
      }
      return true
    },
    setDataInitialized() {
      return this.SET_DATA_INITIALIZED()
    },
    async approveTag(d: any) {
      if (this.profile?.isBikeTagAmbassador) {
        d.hash = this.game.queuehash
        const token = d.token
        d.token = undefined
        try {
          const approveTagResponse = await client.plainRequest({
            method: 'POST',
            url: getApiUrl('approve'),
            data: { tag: d, ambassadorId: this.profile.sub },
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
    async dequeueTag(d: any) {
      if (this.profile?.isBikeTagAmbassador) {
        d.hash = this.game.queuehash
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
    async assignName(profile: any) {
      await client.plainRequest({
        method: 'PUT',
        url: getApiUrl('profile'),
        headers: {
          authorization: `Bearer ${profile.token}`,
          'content-type': 'application/json',
        },
        data: { user_metadata: { name: profile.user_metadata.name } },
      })
      return this.SET_PROFILE(profile)
    },
    async updateProfile(profile: any) {
      // Update Auth0 Profile
      profile.name = this.profile.name
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

      return this.SET_PROFILE(updatedProfileResponse.data)
    },
    // eslint-disable-next-line no-empty-pattern
    async checkPasscode({ name, passcode }: any) {
      return await client.plainRequest({
        method: 'GET',
        url: getApiUrl('profile'),
        headers: {
          authorization: `Basic ${setNPAuthorization(`${name}::${passcode}`)}`,
        },
      })
    },
    // eslint-disable-next-line no-empty-pattern
    async getUserSocial(name: any) {
      return await client.plainRequest({
        method: 'GET',
        url: getApiUrl('profile'),
        params: {
          name,
        },
      })
    },
    async dequeueFoundTag() {
      if (this.playerTag?.playerId === this.profile.sub) {
        const queuedTag: any = this.playerTag
        queuedTag.hash = this.game.queuehash
        return client.deleteTag(queuedTag).then(async (t) => {
          if (t.success) {
            debug('store::found tag dequeued', this.playerTag)
            await this.SET_QUEUED_TAG({})
            await this.RESET_FORM_STEP_TO_FOUND()

            return true
          } else {
            return t.error ? t.error : Array.isArray(t.data) ? t.data.join(' - ') : t.data
          }
        })
      }

      return false
    },
    async dequeueMysteryTag() {
      if (this.playerTag?.playerId === this.profile.sub) {
        const queuedFoundTag: any = BikeTagClient.getters.getOnlyFoundTagFromTagData(this.playerTag)
        const queuedMysteryTag: any = BikeTagClient.getters.getOnlyMysteryTagFromTagData(
          this.playerTag
        )
        queuedMysteryTag.hash = this.game.queuehash
        return client.deleteTag(queuedMysteryTag).then(async (t) => {
          if (t.success) {
            debug('store::mystery tag dequeued')
            await this.SET_QUEUED_TAG(queuedFoundTag)
            await this.RESET_FORM_STEP_TO_MYSTERY()

            return true
          } else {
            debug('error::dequeue BikeTag failed', t)
            return t.error
          }
        })
      }
    },
    async addFoundTag(d: any) {
      if (d.foundImage && !d.foundImageUrl) {
        d.playerId = this.profile.sub
        return client.queueTag(d).then((t) => {
          if (t.success) {
            this.SET_QUEUE_FOUND(t.data)
          } else {
            debug('error::queue (Found) BikeTag failed', t)
            return t.error
          }
          return t.success
        })
      }
      return this.SET_QUEUE_FOUND(d)
    },
    async addMysteryTag(d: any) {
      if (d.mysteryImage && !d.mysteryImageUrl) {
        d.playerId = this.profile.sub

        return client.queueTag(d).then((t) => {
          if (t.success) {
            this.SET_QUEUE_MYSTERY(t.data)
          } else {
            debug('error::queue (Mystery) BikeTag failed', t)
            return t.error
          }
          return t.success
        })
      }
      return this.SET_QUEUE_MYSTERY(d)
    },
    async postNewBikeTag(d: any) {
      if (d.mysteryImageUrl && d.foundImageUrl) {
        d.playerId = this.profile.sub
        return client.queueTag(d).then((t) => {
          if (t.success) {
            this.SET_QUEUED_SUBMITTED(t.data)
          } else {
            debug('error::submit BikeTag failed', t)
            return t.error
          }
          return t.success
        })
      }
      return false
    },
    // async resetFormStep() {
    //   return this.RESET_FORM_STEP()
    // },
    async resetFormStepToFound() {
      await this.SET_QUEUED_TAG()
      return this.RESET_FORM_STEP_TO_FOUND()
    },
    async resetFormStepToMystery() {
      await this.SET_QUEUED_TAG({
        foundImage: this.playerTag.foundImage,
        foundImageUrl: this.playerTag.foundImageUrl,
        foundLocation: this.playerTag.foundLocation,
        foundPlayer: this.playerTag.foundPlayer,
        playerId: this.playerTag.playerId,
      })
      return this.RESET_FORM_STEP_TO_MYSTERY()
    },
    async resetFormStepToPost() {
      await this.SET_QUEUED_TAG({
        foundImage: this.playerTag.foundImage,
        foundImageUrl: this.playerTag.foundImageUrl,
        foundLocation: this.playerTag.foundLocation,
        foundPlayer: this.playerTag.foundPlayer,
        mysteryImage: this.playerTag.foundImage,
        playerId: this.playerTag.playerId,
        mysteryImageUrl: this.playerTag.foundImageUrl,
        hint: this.playerTag.hint,
        mysteryPlayer: this.playerTag.mysteryPlayer,
      })
      // return this.RESET_FORM_STEP_TO_POST()
      return undefined
    },
    async getAmbassadorPermission() {
      return this.profile?.isBikeTagAmbassador
    },

    // ==================================================================
    // ======= mutations ================================================
    // ==================================================================

    SET_DATA_INITIALIZED() {
      this.dataInitialized = true
    },
    SET_PROFILE(profile: any) {
      const oldState = this.profile
      this.profile = profile
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
    SET_GAME(game: any) {
      const oldState = this.game
      this.game = game

      if (oldState?.name !== game?.name) {
        debug('store::game', { game })
      }
    },
    SET_ALL_GAMES(allGames: any) {
      const oldState = this.allGames
      this.allGames = allGames

      if (oldState?.length !== allGames?.length) {
        debug('store::allGames', { allGames })
      }
    },
    SET_CURRENT_TAG(tag: any) {
      const oldState = this.currentBikeTag
      this.currentBikeTag = tag

      if (oldState?.tagnumber !== tag?.tagnumber) {
        debug('store::currentBikeTag', { tag })
      }
    },
    SET_TAGS(tags: any) {
      const oldState = this.tags
      this.tags = tags

      if (oldState?.length !== tags?.length) {
        debug('store::tags', { tags })
      }
    },
    SET_LEADERBOARD(leaderboard: any) {
      const oldState = this.leaderboard
      this.leaderboard = leaderboard

      if (oldState?.length !== leaderboard?.length) {
        debug('store::leaderboard', { leaderboard })
      }
    },
    SET_PLAYERS(players: any) {
      const oldState = this.players
      this.players = players

      if (oldState?.length !== players?.length) {
        debug('store::players', { players })
      }
    },
    SET_QUEUED_TAGS(queuedTags: any) {
      const oldState = this.tagsInRound
      this.tagsInRound = queuedTags

      if (oldState?.length !== queuedTags?.length || queuedTags.length === 0) {
        debug('store::queuedTags', { queuedTags })
      }
    },
    SET_QUEUE_FOUND(data: any) {
      const oldState = this.playerTag
      this.playerTag = BikeTagClient.createTagObject(data, this.playerTag)
      // setQueuedTagInCookie(this.queuedTag)

      // this.queuedTag.foundImageUrl = data.foundImageUrl
      // this.queuedTag.foundImage = data.foundImage
      // this.queuedTag.foundLocation = data.foundLocation
      // this.queuedTag.foundPlayer = data.foundPlayer
      // this.queuedTag.tagnumber = data.tagnumber
      // this.queuedTag.playerId = data.playerId

      if (
        oldState?.foundImageUrl !== data?.foundImageUrl ||
        oldState?.foundImage !== data?.foundImage ||
        oldState?.foundLocation !== data?.foundImageUrl ||
        oldState?.foundPlayer !== data?.foundPlayer ||
        oldState?.tagnumber !== data?.tagnumber ||
        /// In case of a reset to this step
        oldState?.mysteryPlayer !== data?.foundPlayer
      ) {
        debug('store::queuedFoundTag', this.playerTag)
        if (oldState?.mysteryPlayer !== data?.foundPlayer) {
          this.formStep = BiketagFormSteps.roundJoined
        } else {
          this.formStep = BiketagFormSteps.addFoundImage
        }
      }
    },
    SET_QUEUE_MYSTERY(data: any) {
      const oldState = this.playerTag
      this.playerTag = BikeTagClient.createTagObject(data, this.playerTag)
      // setQueuedTagInCookie(this.queuedTag)

      // this.queuedTag.mysteryImageUrl = data.mysteryImageUrl
      // this.queuedTag.mysteryImage = data.mysteryImage
      // this.queuedTag.hint = data.hint
      // this.queuedTag.mysteryPlayer = data.mysteryPlayer ?? this.queuedTag.foundPlayer
      // this.queuedTag.tagnumber = data.tagnumber
      // this.queuedTag.playerId = data.playerId
      // this.queuedTag.game = data.game ?? this.game.name

      if (
        oldState?.mysteryImageUrl !== data?.mysteryImageUrl ||
        oldState?.mysteryImage !== data?.mysteryImage ||
        oldState?.hint !== data?.hint ||
        oldState?.mysteryPlayer !== data?.mysteryPlayer ||
        oldState?.discussionUrl !== data?.discussionUrl ||
        oldState?.mentionUrl !== data?.mentionUrl ||
        oldState?.tagnumber !== data?.tagnumber
      ) {
        debug('store::queuedMysteryTag', this.playerTag)
        if (
          oldState?.discussionUrl !== data?.discussionUrl ||
          oldState?.mentionUrl !== data?.mentionUrl
        ) {
          this.formStep = BiketagFormSteps.roundPosted
        } else {
          this.formStep = BiketagFormSteps.addMysteryImage
        }
      }
    },
    SET_QUEUED_SUBMITTED(data: any) {
      const oldState = this.playerTag
      this.playerTag.discussionUrl = data.discussionUrl
      this.playerTag.mentionUrl = data.mentionUrl
      // setQueuedTagInCookie(this.queuedTag)

      if (
        oldState?.discussionUrl !== data?.discussionUrl ||
        oldState?.mentionUrl !== data?.mentionUrl
      ) {
        debug('store::submittedTag', this.playerTag)
        this.formStep = BiketagFormSteps.roundPosted
      }
    },
    SET_QUEUED_TAG(data?: any) {
      const oldState = this.playerTag
      this.playerTag = BikeTagClient.createTagObject(data, data ? this.playerTag : {})
      // setQueuedTagInCookie(data ? this.queuedTag : undefined)

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
        debug('store::queuedTag', this.playerTag)
      }
    },
    SET_FORM_STEP_TO_JOIN(force: any) {
      const setQueudState = this.formStep !== BiketagFormSteps.roundJoined || force
      const oldState = this.formStep
      if (setQueudState && this.playerTag) {
        this.formStep = getQueuedTagState(this.playerTag)
      } else {
        this.formStep = BiketagFormSteps.roundJoined
      }

      if (oldState !== this.formStep) {
        debug('state::queue', BiketagFormSteps[this.formStep])
      }
    },
    SET_QUEUED_TAG_STATE(tag: any) {
      // this.formStep = getQueuedTagState(tag ?? this.queuedTag)
      this.formStep = getQueuedTagState(tag)
    },
    // RESET_FORM_STEP() {
    //   this.formStep =
    //     this.queuedTags?.length > 0 ? BiketagFormSteps.viewRound : BiketagFormSteps.addFoundImage
    //   debug('state::queue', BiketagFormSteps[this.formStep])
    // },
    RESET_FORM_STEP_TO_FOUND() {
      this.formStep = BiketagFormSteps.addFoundImage
      // debug('state::queue', BiketagFormSteps[this.formStep])
    },
    RESET_FORM_STEP_TO_MYSTERY() {
      this.formStep = BiketagFormSteps.addMysteryImage
      // debug('state::queue', BiketagFormSteps[this.formStep])
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
})
