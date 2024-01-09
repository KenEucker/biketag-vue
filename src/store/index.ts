import BikeTagClient from 'biketag'
import { Achievement, Game, Player, Tag } from 'biketag/lib/common/schema'
import { createPinia, defineStore } from 'pinia'
import { BikeTagDefaults, BiketagFormSteps, State } from '../common/types'
import {
  debug,
  encodeBikeTagString,
  getApiUrl,
  getBikeTagClientOpts,
  getBikeTagHash,
  getDomainInfo,
  getImgurImageSized,
  getMostRecentlyViewedBikeTagTagnumber,
  getProfileFromCookie,
  getQueuedTagState,
  getSanityImageUrl,
  getSupportedGames,
  setProfileCookie,
} from '../common/utils'

const domain = getDomainInfo(window)
const profile = getProfileFromCookie()
const mostRecentlyViewedTagnumber = getMostRecentlyViewedBikeTagTagnumber(0)
const gameName = domain.subdomain ?? process.env.GAME_NAME ?? BikeTagDefaults.gameName
/// TODO: move these options to a method for FE use only
const biketagClientOptions: any = {
  // biketag: {
  cached: true,
  host: process.env.CONTEXT === 'dev' ? getApiUrl() : `https://${gameName}.biketag.org/api`,
  // game: gameName,
  clientKey: getBikeTagHash(window.location.hostname),
  // clientToken: process.env.ACCESS_TOKEN,
  // },
  ...getBikeTagClientOpts(window),
}
const gameOpts = { source: BikeTagDefaults.source }
/// TODO: move these constants to common
const defaultLogo = BikeTagDefaults.logo
const defaultJingle = BikeTagDefaults.jingle
const sanityBaseCDNUrl = `${process.env.S_CURL}${biketagClientOptions.sanity?.projectId}/${biketagClientOptions.sanity?.dataset}/`

debug(`init::${BikeTagDefaults.store}`, {
  subdomain: domain.subdomain,
  domain,
  gameName,
  profile,
})

/// TODO: create a helper for the instantiation of the biketag client (use singleton?)
const client = new BikeTagClient(biketagClientOptions)
let storedRegionPolygon: any = localStorage.getItem(`${gameName}::regionPolygon`)
try {
  storedRegionPolygon = JSON.parse(storedRegionPolygon)
} catch (e) {
  storedRegionPolygon = null
}
export const store = createPinia()
export const useBikeTagStore = defineStore(BikeTagDefaults.store, {
  state: (): State => ({
    dataInitialized: false,
    gameName,
    gameNameProper: gameName[0].toUpperCase() + gameName.slice(1),
    game: {} as Game,
    allGames: [] as Game[],
    achievements: [] as Achievement[],
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
    regionPolyon: storedRegionPolygon,
  }),
  actions: {
    // eslint-disable-next-line no-empty-pattern
    async getRegionPolygon(region: any) {
      try {
        if (this.regionPolyon) return this.regionPolyon
        else if (!region?.description?.length) {
          return
        }

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
              v?.geojson.coordinates[0].length > 1),
        )
        const sortedResults = filteredResults.sort((v1: any, v2: any) => {
          if (v2?.display_name.toLowerCase().indexOf(firstOfRegion) === 0) {
            return 1
          } else if (v1?.geojson?.type === 'Polygon' || v1?.geojson?.type === 'MultiPolygon') {
            return -1
          }
          return 0
        })
        this.SET_REGION_POLYGON(sortedResults[0])
        return sortedResults[0]
      } catch (e) {
        console.log('map cannot continue')
        console.error(e)
      }
    },
    async fetchCredentials() {
      if (!this.credentialsFetched) {
        // console.log('fetching credentials')]
        try {
          await client.config(
            { ...biketagClientOptions, ...getBikeTagClientOpts(window, true) },
            false,
            true,
          )
        } catch (e) {
          console.error('error fetching credentials', e)
        }
        // const credentials = await client.fetchCredentials()
        // await client.config(credentials, false, true)
        this.credentialsFetched = true
        // if (this.profile?.isBikeTagAmbassador) {
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
    async setProfile(profile: any, token?: string) {
      /// Call to backend api GET on /profile with authorization header
      if (profile) {
        token = token ?? profile.token
        profile.token = undefined

        const response = await client
          .plainRequest({
            method: 'GET',
            url: getApiUrl('profile'),
            headers: {
              authorization: `Bearer ${token}`,
            },
          })
          .catch((e) => {
            console.error('error fetching profile', e)
            return e
          })
        if (response.status == 200) {
          if (typeof response.data === 'string') {
            const biketagProfile = JSON.parse(response.data)
            return this.SET_PROFILE(biketagProfile)
          } else if (typeof response.data === 'object') {
            return this.SET_PROFILE(response.data)
          }
        } else if (response.status === 400) {
          return { error: response.data.error }
        }
      }

      return this.SET_PROFILE(profile)
    },
    async setGame() {
      if (!this.game?.mainhash) {
        return client.game(this.gameName, gameOpts as any).then(async (d) => {
          if (d) {
            const game = d as Game
            biketagClientOptions.imgur.hash = game.mainhash
            biketagClientOptions.imgur.queuehash = game.queuehash
            client.config(biketagClientOptions)

            return this.SET_GAME(game)
          }
          return false
        })
      }
    },
    async resetBikeTagCache() {
      /// TODO: add a check for stale cache before unnecessarily resetting
      await this.fetchTags(false)
      await this.fetchCurrentBikeTag(false)
      await this.fetchQueuedTags(true)
    },
    fetchAllGames(cached = true) {
      const biketagClient = new BikeTagClient({ ...biketagClientOptions, game: undefined, cached })
      return biketagClient
        .getGame(
          { game: '' },
          {
            source: 'sanity',
          },
        )
        .then((d) => {
          if (d.success) {
            const games = d.data as unknown as Game[]
            const supportedGames = getSupportedGames(games)
            return this.SET_ALL_GAMES(supportedGames)
          }

          return false
        })
    },
    fetchAllAchievements(cached = true) {
      return client.getAchievements({ cached }).then((r) => this.SET_ACHIEVEMENTS(r.data))
    },
    fetchCurrentBikeTag(cached = true) {
      return client.getTag({ cached }).then((r) => {
        return this.SET_CURRENT_TAG(r.data)
      })
    },
    fetchTags(cached = true) {
      return client.tags({ cached }).then(this.SET_TAGS)
    },
    fetchQueuedTag(d: any) {
      return this.SET_QUEUED_TAG(d)
    },
    async fetchQueuedTags(withCredentials = false) {
      if (this.currentBikeTag?.tagnumber > 0) {
        if (withCredentials) {
          await this.fetchCredentials()
        }

        return client.queue({ cached: false }).then((d) => {
          if ((d as Tag[])?.length > 0) {
            const currentBikeTagQueue: Tag[] = (d as Tag[]).filter(
              (t) => t.tagnumber >= this.currentBikeTag.tagnumber,
            )
            /// Get the player queued tag by player id
            const [playerQueuedTag] = currentBikeTagQueue.filter(
              (t) => this.profile?.sub && t.playerId === this.profile.sub,
            )

            if (playerQueuedTag) {
              // const [queuedMysteryTag] = (d as Tag[]).filter(
              //   (t) => t.mysteryPlayer === playerQueuedTag.foundPlayer,
              // )
              // if (queuedMysteryTag) {
              //   /// Add the mystery tag image to the player queued tag (WHY?)
              //   playerQueuedTag.mysteryImage = queuedMysteryTag.mysteryImage
              //   playerQueuedTag.mysteryImageUrl = queuedMysteryTag.mysteryImageUrl
              //   playerQueuedTag.mysteryPlayer = queuedMysteryTag.mysteryPlayer
              // }
              this.SET_QUEUED_TAG(playerQueuedTag)
              this.SET_QUEUED_TAG_STATE(playerQueuedTag)
            } else {
              this.SET_QUEUED_TAG()
            }

            return this.SET_QUEUED_TAGS(currentBikeTagQueue)
          } else {
            this.SET_QUEUED_TAG()
            this.SET_QUEUED_TAG_STATE()
            return this.SET_QUEUED_TAGS([])
          }
        })
      }

      return false
    },
    fetchPlayers(cached = true) {
      return client.players({ cached }).then(this.SET_PLAYERS)
    },
    fetchLeaderboard(cached = true) {
      return client.players({ sort: 'top', limit: 10, cached }).then(this.SET_LEADERBOARD)
    },
    async fetchLeaderboardPlayersProfiles(cached = true) {
      const names = this.leaderboard.map((p) => p.name)
      return client.players({ names, cached }, gameOpts as any).then(async (d) => {
        if (Array.isArray(d)) {
          d.forEach((p) => this.SET_PLAYER(p))
        }
      })
    },
    // eslint-disable-next-line no-empty-pattern
    async fetchPlayerProfile(name: any, force = false) {
      const existingPlayerIndex = this.players.findIndex((p) => p.name === name)
      if (!force && existingPlayerIndex !== -1) {
        const hasTags = !!this.players[existingPlayerIndex].tags?.length
        const biconIsSet = !!this.players[existingPlayerIndex].bicon?.length
        const hasSlug = !!this.players[existingPlayerIndex].slug?.length
        const mightAlreadyHaveBeenFetched = hasTags && (hasSlug || biconIsSet)

        if (mightAlreadyHaveBeenFetched) {
          return this.players[existingPlayerIndex]
        }
      }

      // console.log('fetching player profile', name)
      const playerProfileResult = await client
        .plainRequest({
          method: 'GET',
          url: getApiUrl('profile'),
          params: {
            name,
          },
        })
        .catch((err) => ({
          status: err.response?.status,
          data: err.response?.data,
        }))

      if (playerProfileResult.status !== 200) {
        return existingPlayerIndex !== -1 ? this.players[existingPlayerIndex] : {}
      }

      const playerProfile = playerProfileResult.data

      return this.SET_PLAYER(playerProfile, existingPlayerIndex)
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
            debug(`${BikeTagDefaults.store}::tag dequeued`, d)
          } else {
            debug('error::dequeue BikeTag failed', t)
            return t.error ? t.error : Array.isArray(t.data) ? t.data.join(' - ') : t.data
          }
          return true
        })
      }
      return 'incorrect permissions'
    },
    async assignPlayerName(profile: any) {
      const nameAssigned = await client.plainRequest({
        method: 'PUT',
        url: getApiUrl('profile'),
        headers: {
          authorization: `Bearer ${profile.token}`,
          'content-type': 'application/json',
        },
        data: { user_metadata: { name: profile.user_metadata?.name } },
      })

      if (nameAssigned.status === 200) {
        profile.name = nameAssigned.data.user_metadata.name
        return this.SET_PROFILE(profile)
      }

      return null
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
    async checkPasscode({ name, passcode }: any) {
      return client.plainRequest({
        method: 'GET',
        url: getApiUrl('profile'),
        headers: {
          authorization: `Basic ${encodeBikeTagString(`${name}::${passcode}`)}`,
        },
      })
    },
    getBikeTagAchievement(name: string) {
      return this.achievements.find((a) => a.name === name)
    },
    getBikeTagAchievements(names: string | string[]) {
      names = Array.isArray(names) ? names : [names]
      return this.achievements.filter((a) => names.includes(a.name))
    },
    async dequeueFoundTag() {
      if (this.playerTag?.playerId === this.profile.sub) {
        const queuedTag: any = this.playerTag
        queuedTag.hash = this.game.queuehash
        return client.deleteTag(queuedTag).then(async (t) => {
          if (t.success) {
            debug(`${BikeTagDefaults.store}::found tag dequeued`, this.playerTag)
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
          this.playerTag,
        )
        queuedMysteryTag.hash = this.game.queuehash
        return client.deleteTag(queuedMysteryTag).then(async (t) => {
          if (t.success) {
            debug(`${BikeTagDefaults.store}::mystery tag dequeued`)
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

      if (
        (profile && profile?.name !== oldState?.name) ||
        profile?.user_metadata?.name !== oldState?.user_metadata?.name ||
        profile?.isBikeTagAmbassador !== oldState?.isBikeTagAmbassador
      ) {
        this.profile = profile
        setProfileCookie(profile)
        debug(`${BikeTagDefaults.store}::profile`, profile)
      }

      return this.profile
    },
    SET_GAME(game: any) {
      const oldState = this.game
      this.game = game

      if (oldState?.name !== game?.name) {
        debug(`${BikeTagDefaults.store}::game`, { game })
      }

      return this.game
    },
    SET_ALL_GAMES(allGames: any) {
      const oldState = this.allGames
      this.allGames = allGames

      if (oldState?.length !== allGames?.length) {
        debug(`${BikeTagDefaults.store}::allGames`, { allGames })
      }

      return this.allGames
    },
    SET_CURRENT_TAG(tag: any) {
      const oldState = this.currentBikeTag
      this.currentBikeTag = tag

      if (oldState?.tagnumber !== tag?.tagnumber) {
        debug(`${BikeTagDefaults.store}::currentBikeTag`, { tag })
      }

      return this.currentBikeTag
    },
    SET_ACHIEVEMENTS(achievements: any) {
      const oldState = this.achievements
      this.achievements = achievements

      if (oldState?.length !== achievements?.length) {
        debug(`${BikeTagDefaults.store}::achievements`, { achievements })
      }

      return this.achievements
    },
    SET_TAGS(tags: any) {
      const oldState = this.tags
      this.tags = tags

      if (oldState?.length !== tags?.length) {
        debug(`${BikeTagDefaults.store}::tags`, { tags })
      }

      return this.tags
    },
    SET_LEADERBOARD(leaderboard: any) {
      const oldState = this.leaderboard
      this.leaderboard = leaderboard

      if (oldState?.length !== leaderboard?.length) {
        debug(`${BikeTagDefaults.store}::leaderboard`, { leaderboard })
      }

      return this.leaderboard
    },
    SET_PLAYER(player: any, existingPlayerIndex?: number) {
      if (player) {
        existingPlayerIndex =
          existingPlayerIndex ?? this.players.findIndex((p) => p.name === player.name)
        if (existingPlayerIndex !== -1) {
          const existingPlayer = this.players[existingPlayerIndex]
          player = { ...existingPlayer, ...player }
          player.tags = existingPlayer.tags?.length ? existingPlayer.tags : player.tags
          player.achievements = existingPlayer.achievements?.length
            ? existingPlayer.achievements
            : player.achievements
          player.games =
            existingPlayer.games?.length > player.games?.length
              ? existingPlayer.games
              : player.games
          this.players[existingPlayerIndex] = player
          debug(`${BikeTagDefaults.store}::player: ${player.name}`, { player })
        }
      }
      return player
    },
    SET_PLAYERS(players: any) {
      const oldState = this.players
      this.players = players

      if (oldState?.length !== players?.length) {
        debug(`${BikeTagDefaults.store}::players`, { players })
      }

      return this.players
    },
    SET_QUEUED_TAGS(queuedTags: any) {
      const oldState = this.tagsInRound
      this.tagsInRound = queuedTags

      if (oldState?.length !== queuedTags?.length || queuedTags.length === 0) {
        debug(`${BikeTagDefaults.store}::queuedTags`, { queuedTags })
      }

      return this.tagsInRound
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
        debug(`${BikeTagDefaults.store}::queuedFoundTag`, this.playerTag)
        this.resetBikeTagCache()
        console.log('SET_QUEUE_FOUND')
        if (oldState?.mysteryPlayer !== data?.foundPlayer) {
          this.formStep = BiketagFormSteps.roundJoined
        } else {
          this.formStep = BiketagFormSteps.addFoundImage
        }
      }

      return this.playerTag
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
        debug(`${BikeTagDefaults.store}::queuedMysteryTag`, this.playerTag)
        this.resetBikeTagCache()
        if (
          oldState?.discussionUrl !== data?.discussionUrl ||
          oldState?.mentionUrl !== data?.mentionUrl
        ) {
          this.formStep = BiketagFormSteps.roundPosted
        } else {
          this.formStep = BiketagFormSteps.addMysteryImage
        }
      }

      return this.playerTag
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
        debug(`${BikeTagDefaults.store}::submittedTag`, this.playerTag)
        this.resetBikeTagCache()
        this.formStep = BiketagFormSteps.roundPosted
      }

      return this.playerTag
    },
    SET_QUEUED_TAG(data?: any) {
      const oldState = this.playerTag
      this.playerTag = BikeTagClient.createTagObject(data ?? {}, data ? {} : this.playerTag)
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
        debug(`${BikeTagDefaults.store}::queuedTag`, this.playerTag)
      }

      return this.playerTag
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

      return this.formStep
    },
    SET_QUEUED_TAG_STATE(tag?: any) {
      // this.formStep = getQueuedTagState(tag ?? this.queuedTag)
      /// If the current player won the last round, set the tag state to share post
      if (
        (this.profile?.name && this.profile?.name === this.currentBikeTag?.mysteryPlayer) ||
        (this.profile?.sub && this.profile?.sub === this.currentBikeTag?.playerId)
      ) {
        this.formStep = BiketagFormSteps.shareBikeTagPost
      } else if (tag) {
        this.formStep = getQueuedTagState(tag)
      } else {
        this.formStep = BiketagFormSteps.addFoundImage
      }

      return this.formStep
    },
    // RESET_FORM_STEP() {
    //   this.formStep =
    //     this.queuedTags?.length > 0 ? BiketagFormSteps.viewRound : BiketagFormSteps.addFoundImage
    //   debug('state::queue', BiketagFormSteps[this.formStep])
    // },
    RESET_FORM_STEP_TO_FOUND() {
      console.log('RESET_FORM_STEP_TO_FOUND')
      this.formStep = BiketagFormSteps.addFoundImage
      // debug('state::queue', BiketagFormSteps[this.formStep])

      return this.formStep
    },
    RESET_FORM_STEP_TO_MYSTERY() {
      this.formStep = BiketagFormSteps.addMysteryImage
      // debug('state::queue', BiketagFormSteps[this.formStep])

      return this.formStep
    },
    SET_REGION_POLYGON(regionPolygon: any) {
      localStorage.setItem(`${gameName}::regionPolygon`, JSON.stringify(regionPolygon))
      this.regionPolyon = regionPolygon

      return this.regionPolyon
    },
  },
  getters: {
    getAmbassadorId(state) {
      if (state.profile?.isBikeTagAmbassador) {
        return state.profile?.sub
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
      return state.profile?.sub
    },
    getPlayerName(state) {
      return state.profile?.user_metadata?.name
    },
    getGameBoundary(state) {
      return state.game?.boundary
    },
    getGameSettings(state) {
      return state.game?.settings
    },
    getGameAchievements(state) {
      return state.achievements
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
    getGameNameProper(state) {
      return state.gameNameProper
    },
    getLogoUrl(state) {
      return (size = '', logo?: string, squared = false) => {
        logo = logo ? logo : state.game?.logo?.length ? state.game?.logo : undefined

        if (!logo) {
          return defaultLogo
        }

        return logo.indexOf('imgur.com') !== -1
          ? logo
          : getSanityImageUrl(logo, size, sanityBaseCDNUrl, squared)
      }
    },
    getCurrentHint(state) {
      return state.currentBikeTag?.hint
    },
    getCurrentBikeTag(state) {
      return state.currentBikeTag
    },
    getPreviousBikeTag(state) {
      return state.tags[1]
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
