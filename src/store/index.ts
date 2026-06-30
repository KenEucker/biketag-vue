import BikeTagClient from 'biketag'
import { Achievement, Game, Player, Tag } from 'biketag/dist/common/schema'
import { defineStore } from 'pinia'
import {
  BikeTagDefaults,
  BikeTagEnv,
  BikeTagStoreState,
  BiketagQueueFormSteps,
  debug,
  encodeBikeTagString,
  getApiUrl,
  getBikeTagClientOpts,
  getDomainInfo,
  getImageSized,
  getMostRecentlyViewedBikeTagTagnumber,
  getProfileFromCookie,
  getQueryParam,
  getQueuedTagState,
  getRegionPolygonFromCookie,
  getSanityImageUrl,
  getSupportedGames,
  getTokenFromCookie,
  isGlobalAdminEmail,
  setProfileCookie,
  setRegionPolygonInCookie,
  setTokenInCookie,
} from '../common'

let client: BikeTagClient
let gameName: string
let biketagClientOpts: any
let bikeTagInitialized = false

export const initBikeTagStore = () => {
  if (localStorage.getItem('banned') === 'true') {
    return
  }

  if (!bikeTagInitialized) {
    bikeTagInitialized = true

    const domain = getDomainInfo(window)
    gameName = domain.subdomain ?? BikeTagEnv.GAME_NAME ?? BikeTagDefaults.gameName
    biketagClientOpts = {
      cached: true,
      verbose: getQueryParam(window, 'debug_a') === 'true' || BikeTagEnv.DEBUG_FE === 'true',
      host:
        BikeTagEnv.CONTEXT === 'dev' ? getApiUrl() : `https://${gameName}.${BikeTagEnv.HOST}/api`,
      clientToken: getTokenFromCookie(),
      // game: gameName,
      ...getBikeTagClientOpts(window, BikeTagEnv.BIKETAG_AUTHED === 'true'),
    }

    debug(`${BikeTagDefaults.store}::init`, {
      gameName,
      host: domain.host,
      subdomain: domain.subdomain,
    })

    /// TODO: create a helper for the instantiation of the biketag client (use singleton?)
    client = new BikeTagClient(biketagClientOpts)
  }
}

export const useBikeTagStore = defineStore(BikeTagDefaults.store, {
  state: (): BikeTagStoreState => ({
    fetchingData: false,
    dataFetched: false,
    credentialsFetched: false,
    lastCacheResetTime: 0,
    cacheResetInterval: parseInt(BikeTagEnv.CACHE_RESET_INTERVAL),
    gameName,
    gameNameProper: gameName?.length ? gameName[0].toUpperCase() + gameName.slice(1) : '',
    imageSource: BikeTagEnv.IMAGE_SOURCE,
    gameSource: BikeTagEnv.GAME_SOURCE,
    game: {} as Game,
    allGames: [] as Game[],
    achievements: [] as Achievement[],
    currentBikeTag: {} as Tag,
    tags: [] as Tag[],
    tagsInRound: [] as Tag[],
    players: [] as Player[],
    leaderboard: [] as Player[],
    formStep: BiketagQueueFormSteps.addFoundImage,
    mostRecentlyViewedTagnumber: getMostRecentlyViewedBikeTagTagnumber(0),
    regionPolygon: getRegionPolygonFromCookie(`${gameName}::regionPolygon`),
    // queuedTag: getQueuedTagFromCookie() ?? ({} as Tag),
    playerTag: {} as Tag,
    auth0Token: '',
    profile: getProfileFromCookie(),
    token: getTokenFromCookie(),
  }),

  actions: {
    async isReady() {
      if (this.dataFetched) {
        return Promise.resolve() // Data is already loaded, resolve immediately
      }

      return new Promise((resolve) => {
        const checkIsDataLoaded = () => {
          if (this.dataFetched) {
            clearInterval(intervalId) // Stop checking when isDataLoaded becomes true
            resolve(true)
          }
        }
        const intervalId = setInterval(checkIsDataLoaded, 100) // Check every 100 milliseconds (adjust as needed)
        checkIsDataLoaded() // Check immediately
      })
    },
    // eslint-disable-next-line no-empty-pattern
    async getRegionPolygon(region: any) {
      try {
        if (this.regionPolygon) return this.regionPolygon
        else if (!region?.description?.length) {
          return
        }

        const regionSplit = region.description.split(',')
        if (regionSplit.length) {
          const firstOfRegion = regionSplit[0].toLowerCase()
          // const secondOfRegion = regionSplit.length > 1 ? regionSplit[1].toLowerCase() : null
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
        } else {
          console.log('map cannot continue, region not set properly')
        }
      } catch (e: any) {
        console.log('map cannot continue')
        console.error(e)
      }
    },
    async setProfile(profile: any, token?: string) {
      /// Call to backend api GET on /profile with authorization header
      if (profile) {
        if (profile.token || token) {
          this.auth0Token = token || this.auth0Token || profile.token || ''
        }

        const response = await client
          .plainRequest({
            method: 'GET',
            url: getApiUrl('profile'),
            headers: {
              authorization: `Bearer ${this.auth0Token}`,
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
          await this.fetchCredentials(true)
        } else if (response.status === 400) {
          return { error: response.data.error }
        }
      } else if (token?.length) {
        this.auth0Token = token
        return this.profile
      }

      return this.SET_PROFILE(profile)
    },
    async setGame(newGameName?: string) {
      newGameName = newGameName ?? this.gameName
      if (this.game?.name !== newGameName || !this.game?.mainhash) {
        this.fetchingData = false
        return client
          .getGame({ game: newGameName }, { source: BikeTagDefaults.gameSource })
          .then(async (r) => {
            if (r.success) {
              const game = r.data as Game

              if (game.settings['data::aws'] && game.settings['data::aws'] === 'true') {
                this.imageSource = 'aws'
              } else if (game.settings['data::imgur'] && game.settings['data::imgur'] === 'true') {
                this.imageSource = 'imgur'
              }
              /// TODO: split these up based on the imageSource?
              biketagClientOpts.imgur.hash = game.mainhash
              biketagClientOpts.imgur.queuehash = game.queuehash
              biketagClientOpts.aws.region = game.awsRegion

              // TODO: set the default source to something else, now
              const configuredClient = client.config(biketagClientOpts, true, true)
              debug(`${BikeTagDefaults.store}::client-init`, {
                configuredClient,
                imageSource: this.imageSource,
              })

              return this.SET_GAME(game)
            } else {
              const cachedGame = this.allGames.find((g) => g.name === newGameName)
              if (cachedGame) {
                return this.SET_GAME(cachedGame)
              }
            }
            return false
          })
      }
    },
    async resetBikeTagCache() {
      // TODO: add a check for stale cache before unnecessarily resetting
      const now = Date.now()
      if (now - this.lastCacheResetTime >= this.cacheResetInterval) {
        this.lastCacheResetTime = now
        await this.fetchTags(false)
        await this.fetchCurrentBikeTag()
        await this.fetchQueuedTags(false)
        debug(`${BikeTagDefaults.store}::data`, 'reset cache')
      }
    },
    async fetchCredentials(fetchNewCredentials = false) {
      if (!this.credentialsFetched || fetchNewCredentials) {
        try {
          const biketagConf = await client.fetchCredentials(`player-id ${this.profile.sub}`)
          if (biketagConf?.biketag?.clientToken) {
            this.token = setTokenInCookie(biketagConf.biketag.clientToken)
            debug(`${BikeTagDefaults.store}::credentials`, 'token set')
          }
        } catch (e: any) {
          console.error('error fetching credentials', e)
        }
        this.credentialsFetched = true
      }
    },
    async FetchAllData(
      opts: {
        currentBikeTagSync?: boolean
        skipCurrentBikeTag?: boolean
        tagsSync?: boolean
        skipTags?: boolean
        playersSync?: boolean
        skipPlayers?: boolean
        leaderboardSync?: boolean
        skipLeaderboard?: boolean
        credentialsSync?: boolean
        skipCredentials?: boolean
        queuedTagsSync?: boolean
        skipQueuedTags?: boolean
        allGamesSync?: boolean
        skipAllGames?: boolean
      } = {},
    ) {
      const initResults: any[] = []
      this.fetchingData = true

      if (!opts.skipCurrentBikeTag) {
        if (opts.currentBikeTagSync) initResults.push(await this.fetchCurrentBikeTag())
        else initResults.push(this.fetchCurrentBikeTag())
      }
      if (!opts.skipTags) {
        if (opts.tagsSync) initResults.push(await this.fetchTags())
        else initResults.push(this.fetchTags())
      }
      if (!opts.skipPlayers) {
        if (opts.playersSync) initResults.push(await this.fetchPlayers())
        else initResults.push(this.fetchPlayers())
      }
      if (!opts.skipLeaderboard) {
        if (opts.leaderboardSync) initResults.push(await this.fetchLeaderboard())
        else initResults.push(this.fetchLeaderboard())
      }
      if (!opts.skipQueuedTags) {
        if (opts.queuedTagsSync) initResults.push(await this.fetchQueuedTags())
        else initResults.push(this.fetchQueuedTags())
      }
      if (!opts.skipAllGames) {
        if (opts.allGamesSync) initResults.push(await this.fetchAllGames())
        else initResults.push(this.fetchAllGames())
      }
      if (!opts.skipCredentials) {
        if (opts.credentialsSync) initResults.push(await this.fetchCredentials())
        else this.fetchCredentials() // don't include in initial data fetch results
      }

      Promise.allSettled(initResults).then((results) => {
        this.dataFetched = true
        this.fetchingData = false
      })

      return initResults
    },
    fetchAllGames(cached = true) {
      this.fetchingData = false
      return client
        .getAllGames(undefined, {
          source: BikeTagDefaults.gameSource,
          cached,
        })
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
      return client
        .getAchievements(undefined, { source: this.gameSource, cached })
        .then((r) => this.SET_ACHIEVEMENTS(r.data))
    },
    fetchCurrentBikeTag(cached = true) {
      return client.getTag(undefined, { source: this.imageSource, cached }).then((r) => {
        return this.SET_CURRENT_TAG(r.data)
      })
    },
    fetchTags(cached = true) {
      return client.tags(undefined, { source: this.imageSource, cached }).then(this.SET_TAGS)
    },
    async fetchQueuedTags(cached = true) {
      if (this.currentBikeTag?.tagnumber > 0) {
        return client
          .queue(undefined, { source: cached ? this.imageSource : 'biketag', cached })
          .then((d) => {
            if ((d as Tag[])?.length > 0) {
              const currentBikeTagQueue: Tag[] = d as Tag[]
              // const currentBikeTagQueue: Tag[] = (d as Tag[]).filter(
              //   (t) =>
              //     t.tagnumber > this.currentBikeTag.tagnumber ||
              //     (t.tagnumber === this.currentBikeTag.tagnumber && !t.mysteryImageUrl),
              // )

              /// Get the player queued tag by player id
              const [playerQueuedTag] = currentBikeTagQueue.filter(
                (t) => this.profile?.sub && t.playerId === this.profile.sub,
              )

              if (playerQueuedTag) {
                this.SET_QUEUED_TAG(playerQueuedTag)
                this.SET_QUEUED_TAG_STATE(playerQueuedTag)
              } else {
                this.SET_QUEUED_TAG()
                this.SET_QUEUED_TAG_STATE()
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
      return client.players(undefined, { source: this.imageSource, cached }).then(this.SET_PLAYERS)
    },
    fetchLeaderboard(cached = true) {
      return client
        .players({ sort: 'top', limit: 10 }, { source: this.imageSource, cached })
        .then(this.SET_LEADERBOARD)
    },
    async fetchLeaderboardPlayersProfiles(cached = true) {
      const names = this.leaderboard.map((p) => p.name)
      return client.players({ names }, { source: this.imageSource, cached }).then(async (d) => {
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
      if (this.formStep === BiketagQueueFormSteps.viewRound || d) {
        return this.SET_FORM_STEP_TO_JOIN(d)
      }
      return true
    },
    async approveTag(d: any) {
      if (this.profile?.isBikeTagAmbassador) {
        d.hash = this.game.queuehash
        try {
          const approveTagResponse = await client.plainRequest({
            method: 'POST',
            url: getApiUrl('approve'),
            data: { tag: d, ambassadorId: this.profile.sub },
            headers: {
              authorization: `Bearer ${this.auth0Token}`,
            },
          })
          if (approveTagResponse.status > 199 && approveTagResponse.status < 300) {
            this.resetBikeTagCache()
            return true
          } else {
            return `BikeTag round #${d.tagnumber} couldn't be posted`
          }
        } catch (e: any) {
          console.error('error approving tag', e?.message ?? e)
          return 'error approving tag'
        }
      }

      return 'incorrect permissions'
    },
    async scanQueueIssues() {
      if (!this.isBikeTagAdmin) {
        return 'incorrect permissions'
      }

      try {
        const response = await client.plainRequest({
          method: 'GET',
          url: getApiUrl('queue-fix'),
          headers: {
            authorization: `Bearer ${this.auth0Token}`,
          },
        })

        if (response.status > 199 && response.status < 300) {
          return typeof response.data === 'string' ? JSON.parse(response.data) : response.data
        }

        return response.data?.error || 'failed to scan queue'
      } catch (e: any) {
        console.error('error scanning queue', e?.message ?? e)
        return 'error scanning queue'
      }
    },
    async fixQueueIssues() {
      if (!this.isBikeTagAdmin) {
        return 'incorrect permissions'
      }

      try {
        const response = await client.plainRequest({
          method: 'POST',
          url: getApiUrl('queue-fix'),
          headers: {
            authorization: `Bearer ${this.auth0Token}`,
          },
        })

        if (response.status > 199 && response.status < 300) {
          this.resetBikeTagCache()
          return typeof response.data === 'string' ? JSON.parse(response.data) : response.data
        }

        return response.data?.error || 'failed to fix queue'
      } catch (e: any) {
        console.error('error fixing queue', e?.message ?? e)
        return 'error fixing queue'
      }
    },
    async deleteQueueIssue(issue: { key?: string; url?: string }) {
      if (!this.isBikeTagAdmin) {
        return 'incorrect permissions'
      }

      try {
        const response = await client.plainRequest({
          method: 'POST',
          url: getApiUrl('queue-fix'),
          data: {
            deleteKey: issue.key,
            deleteUrl: issue.url,
          },
          headers: {
            authorization: `Bearer ${this.auth0Token}`,
          },
        })

        if (response.status > 199 && response.status < 300) {
          this.resetBikeTagCache()
          return typeof response.data === 'string' ? JSON.parse(response.data) : response.data
        }

        return response.data?.error || 'failed to delete queue file'
      } catch (e: any) {
        console.error('error deleting queue file', e?.message ?? e)
        return 'error deleting queue file'
      }
    },
    async deleteWrongRoundQueueFiles() {
      if (!this.isBikeTagAdmin) {
        return 'incorrect permissions'
      }

      try {
        const response = await client.plainRequest({
          method: 'POST',
          url: getApiUrl('queue-fix'),
          data: {
            deleteWrongRound: true,
          },
          headers: {
            authorization: `Bearer ${this.auth0Token}`,
          },
        })

        if (response.status > 199 && response.status < 300) {
          this.resetBikeTagCache()
          return typeof response.data === 'string' ? JSON.parse(response.data) : response.data
        }

        return response.data?.error || 'failed to delete wrong-round queue files'
      } catch (e: any) {
        console.error('error deleting wrong-round queue files', e?.message ?? e)
        return 'error deleting wrong-round queue files'
      }
    },
    async moveQueueFoundToMain(issue: { key?: string; url?: string; targetTagnumber?: number }) {
      if (!this.isBikeTagAdmin) {
        return 'incorrect permissions'
      }

      try {
        const response = await client.plainRequest({
          method: 'POST',
          url: getApiUrl('queue-fix'),
          data: {
            moveToMainKey: issue.key,
            moveToMainUrl: issue.url,
            moveToMainTargetRound: issue.targetTagnumber,
          },
          headers: {
            authorization: `Bearer ${this.auth0Token}`,
          },
        })

        if (response.status > 199 && response.status < 300) {
          this.resetBikeTagCache()
          return typeof response.data === 'string' ? JSON.parse(response.data) : response.data
        }

        return response.data?.error || 'failed to move queue found image to main'
      } catch (e: any) {
        console.error('error moving queue found image to main', e?.message ?? e)
        return 'error moving queue found image to main'
      }
    },
    async resendLatestPostNotifications() {
      if (!this.isBikeTagAdmin) {
        return 'incorrect permissions'
      }

      try {
        const response = await client.plainRequest({
          method: 'POST',
          url: getApiUrl('autopost-notify'),
          data: {
            force: true,
          },
          headers: {
            authorization: `Bearer ${this.auth0Token}`,
          },
        })

        if (response.status > 199 && response.status < 300) {
          return typeof response.data === 'string' && response.data.length
            ? JSON.parse(response.data)
            : response.data || []
        }

        return Array.isArray(response.data)
          ? response.data.join(' ')
          : response.data?.error || response.data || 'failed to resend post notifications'
      } catch (e: any) {
        console.error('error resending post notifications', e?.message ?? e)
        return Array.isArray(e.response?.data)
          ? e.response.data.join(' ')
          : e.response?.data?.error || e.response?.data || 'error resending post notifications'
      }
    },
    async dequeueTag(d: any) {
      if (this.profile?.isBikeTagAmbassador) {
        try {
          const dequequeTagResponse = await client.plainRequest({
            method: 'POST',
            url: getApiUrl('delete'),
            data: { tag: d, ambassadorId: this.profile.sub },
            headers: {
              authorization: `Bearer ${this.auth0Token}`,
            },
          })

          if (dequequeTagResponse.status > 199 && dequequeTagResponse.status < 300) {
            this.resetBikeTagCache()
            return true
          } else {
            return `BikeTag #${d.tagnumber} couldn't be dequeued`
          }
        } catch (e: any) {
          console.error('error deleting tag', e?.message ?? e)
          return 'error deleting tag'
        }
      }

      return 'incorrect permissions'
    },
    async deleteCurrentTag(d: any) {
      if (this.profile?.isBikeTagAmbassador) {
        try {
          d.folder = 'main'
          const deleteTagResponse = await client.plainRequest({
            method: 'POST',
            url: getApiUrl('delete'),
            data: { tag: d, ambassadorId: this.profile.sub },
            headers: {
              authorization: `Bearer ${this.auth0Token}`,
            },
          })
          if (deleteTagResponse.status > 199 && deleteTagResponse.status < 300) {
            this.resetBikeTagCache()
            return true
          } else {
            return `BikeTag #${d.tagnumber} couldn't be deleted`
          }
        } catch (e: any) {
          console.error('error deleting tag', e?.message ?? e)
          return 'error deleting tag'
        }
      }

      return 'incorrect permissions'
    },
    async updateCurrentTag(d: any) {
      if (this.profile?.isBikeTagAmbassador) {
        try {
          const updateTagResponse = await client.plainRequest({
            method: 'POST',
            url: getApiUrl('update'),
            data: { tag: d, ambassadorId: this.profile.sub },
            headers: {
              authorization: `Bearer ${this.auth0Token}`,
            },
          })
          if (updateTagResponse.status > 199 && updateTagResponse.status < 300) {
            this.resetBikeTagCache()
            return true
          } else {
            return `BikeTag #${d.tagnumber} couldn't be updated`
          }
        } catch (e: any) {
          console.error('error updating tag', e?.message ?? e)
          return 'error updating tag'
        }
      }

      return 'incorrect permissions'
    },
    async launchGameTag(d: any) {
      if (!this.profile?.isBikeTagAmbassador) {
        return 'incorrect permissions'
      }

      try {
        await this.fetchCredentials(true)

        const uploadPlayerId = d.playerId?.length ? d.playerId : this.profile.sub
        let tag = {
          ...d,
          game: this.gameName,
          tagnumber: 1,
          playerId: uploadPlayerId,
          folder: 'main',
        }

        if (d.mysteryImage && !d.mysteryImageUrl) {
          const upload = await client.uploadTagImage(
            {
              ...tag,
              mysteryImage: d.mysteryImage,
              contentType: d.mysteryImage.type ?? 'image/jpeg',
            },
            { source: this.imageSource },
          )
          if (!upload.success) {
            return upload.error || 'failed to upload mystery image'
          }
          tag = { ...tag, ...upload.data }
        }

        if (!tag.mysteryImageUrl?.length) {
          return 'mystery image is required'
        }

        const response = await client.plainRequest({
          method: 'POST',
          url: getApiUrl('launch'),
          data: {
            game: tag.game,
            playerId: uploadPlayerId,
            mysteryPlayer: tag.mysteryPlayer,
            mysteryTime: tag.mysteryTime,
            mysteryImageUrl: tag.mysteryImageUrl,
            hint: tag.hint,
            ambassadorId: this.profile.sub,
          },
          headers: {
            authorization: `Bearer ${this.auth0Token}`,
          },
        })

        if (response.status > 199 && response.status < 300) {
          const result =
            typeof response.data === 'string' ? JSON.parse(response.data) : response.data
          if (result.errors) {
            const errorMessages = result.results
              ?.filter((r: any) => r.error)
              ?.map((r: any) => r.message || r.error)
              ?.join(', ')
            return errorMessages || 'failed to launch game'
          }
          this.resetBikeTagCache()
          return true
        }

        return 'BikeTag game could not be launched'
      } catch (e: any) {
        console.error('error launching game', e?.message ?? e)
        return 'error launching game'
      }
    },
    async createNewRoundTag(d: any) {
      if (!this.profile?.isBikeTagAmbassador) {
        return 'incorrect permissions'
      }

      try {
        await this.fetchCredentials(true)

        const uploadPlayerId = d.playerId?.length ? d.playerId : this.profile.sub
        let tag = { ...d, game: this.gameName, playerId: uploadPlayerId }

        if (d.foundImage && !d.foundImageUrl) {
          const foundUpload = await client.queueTag(
            { ...tag, foundImage: d.foundImage },
            { source: this.imageSource },
          )
          if (!foundUpload.success) {
            return foundUpload.error || 'failed to upload found image'
          }
          tag = { ...tag, ...foundUpload.data }
          await client.getQueue({ resize: true, reindex: true }, { source: 'biketag' })
        }

        if (d.mysteryImage && !d.mysteryImageUrl) {
          const mysteryUpload = await client.queueTag(
            { ...tag, mysteryImage: d.mysteryImage },
            { source: this.imageSource },
          )
          if (!mysteryUpload.success) {
            return mysteryUpload.error || 'failed to upload mystery image'
          }
          tag = { ...tag, ...mysteryUpload.data }
          await client.getQueue({ resize: true, reindex: true }, { source: 'biketag' })
        }

        if (!tag.foundImageUrl?.length || !tag.mysteryImageUrl?.length) {
          return 'found and mystery images are required'
        }

        const response = await client.plainRequest({
          method: 'POST',
          url: getApiUrl('new'),
          data: {
            game: tag.game,
            tagnumber: tag.tagnumber,
            playerId: uploadPlayerId,
            foundPlayer: tag.foundPlayer,
            foundTime: tag.foundTime,
            foundLocation: tag.foundLocation,
            foundImageUrl: tag.foundImageUrl,
            mysteryPlayer: tag.mysteryPlayer,
            mysteryTime: tag.mysteryTime,
            mysteryImageUrl: tag.mysteryImageUrl,
            hint: tag.hint,
            ambassadorId: this.profile.sub,
          },
          headers: {
            authorization: `Bearer ${this.auth0Token}`,
          },
        })

        if (response.status > 199 && response.status < 300) {
          const result =
            typeof response.data === 'string' ? JSON.parse(response.data) : response.data
          if (result.errors) {
            const errorMessages = result.results
              ?.filter((r: any) => r.error)
              ?.map((r: any) => r.message || r.error)
              ?.join(', ')
            return errorMessages || 'failed to create new round'
          }
          this.resetBikeTagCache()
          return true
        }

        return `BikeTag round #${tag.tagnumber} couldn't be created`
      } catch (e: any) {
        console.error('error creating new round', e?.message ?? e)
        return 'error creating new round'
      }
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
        let source = this.imageSource
        if (this.imageSource === 'aws') {
          source = 'biketag'
        } else if (this.imageSource === 'imgur') {
          queuedTag.hash = this.game.queuehash
        }
        return client.deleteTag(queuedTag, { source }).then(async (t) => {
          if (t.success) {
            debug(`${BikeTagDefaults.store}::dequeue-found-tag`, this.playerTag)
            await client.getQueue({ resize: true, reindex: true }, { source: 'biketag' })
            this.SET_QUEUED_TAG({})
            this.RESET_FORM_STEP_TO_FOUND()

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
        let source = this.imageSource
        if (this.imageSource === 'aws') {
          source = 'biketag'
        } else if (this.imageSource === 'imgur') {
          queuedMysteryTag.hash = this.game.queuehash
        }
        return client.deleteTag(queuedMysteryTag, { source }).then(async (t) => {
          if (t.success) {
            debug(`${BikeTagDefaults.store}::dequeue-mystery-tag`, 'mystery tag dequeued')
            await client.getQueue({ resize: true, reindex: true }, { source: 'biketag' })
            this.SET_QUEUED_TAG(queuedFoundTag)
            this.RESET_FORM_STEP_TO_MYSTERY()

            return true
          } else {
            debug(
              `${BikeTagDefaults.store}::dequeue-mystery-tag`,
              'dequeue BikeTag failed: ' + t.error,
              'error',
            )
            return t.error
          }
        })
      }
    },
    async addFoundTag(d: any) {
      if (d.foundImage && !d.foundImageUrl) {
        d.playerId = this.profile.sub

        return client.queueTag(d, { source: this.imageSource }).then(async (t) => {
          if (t.success) {
            this.SET_QUEUE_FOUND(t.data)
            await client.getQueue({ resize: true, reindex: true }, { source: 'biketag' })
          } else {
            debug(
              `${BikeTagDefaults.store}::queue-found-tag`,
              'queue (Found) BikeTag failed: ' + t.error,
              'error',
            )
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

        return client.queueTag(d, { source: this.imageSource }).then(async (t) => {
          if (t.success) {
            this.SET_QUEUE_MYSTERY(t.data)
            await client.getQueue({ resize: true, reindex: true }, { source: 'biketag' })
          } else {
            debug(
              `${BikeTagDefaults.store}::queue-mystery-tag`,
              'queue (Mystery) BikeTag failed: ' + t.error,
              'error',
            )
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

        return client.queueTag(d, { source: this.imageSource }).then(async (t) => {
          if (t.success) {
            this.SET_QUEUED_SUBMITTED(t.data)
            await client.getQueue({ resize: true, reindex: true }, { source: 'biketag' })
          } else {
            debug(
              `${BikeTagDefaults.store}::queue-post-tag`,
              'queue (Post) BikeTag failed: ' + t.error,
              'error',
            )
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
    // async resetFormStepToFound() {
    //   await this.SET_QUEUED_TAG()
    //   return this.RESET_FORM_STEP_TO_FOUND()
    // },
    // async resetFormStepToMystery() {
    //   await this.SET_QUEUED_TAG({
    //     foundImage: this.playerTag.foundImage,
    //     foundImageUrl: this.playerTag.foundImageUrl,
    //     foundLocation: this.playerTag.foundLocation,
    //     foundPlayer: this.playerTag.foundPlayer,
    //     playerId: this.playerTag.playerId,
    //   })
    //   return this.RESET_FORM_STEP_TO_MYSTERY()
    // },
    // async resetFormStepToPost() {
    //   await this.SET_QUEUED_TAG({
    //     foundImage: this.playerTag.foundImage,
    //     foundImageUrl: this.playerTag.foundImageUrl,
    //     foundLocation: this.playerTag.foundLocation,
    //     foundPlayer: this.playerTag.foundPlayer,
    //     mysteryImage: this.playerTag.foundImage,
    //     playerId: this.playerTag.playerId,
    //     mysteryImageUrl: this.playerTag.foundImageUrl,
    //     hint: this.playerTag.hint,
    //     mysteryPlayer: this.playerTag.mysteryPlayer,
    //   })
    //   // return this.RESET_FORM_STEP_TO_POST()
    //   return undefined
    // },

    // ==================================================================
    // ======= mutations ================================================
    // ==================================================================

    SET_PROFILE(profile?: any) {
      const oldState = this.profile

      if (profile) {
        profile = { ...profile }
        if (isGlobalAdminEmail(profile.email)) {
          profile.isBikeTagAdmin = true
          profile.isBikeTagAmbassador = true
        }
      }

      if (
        (profile && profile?.name !== oldState?.name) ||
        profile?.user_metadata?.name !== oldState?.user_metadata?.name ||
        profile?.isBikeTagAmbassador !== oldState?.isBikeTagAmbassador ||
        profile?.isBikeTagAdmin !== oldState?.isBikeTagAdmin
      ) {
        this.profile = profile
        setProfileCookie(profile)
        debug(`${BikeTagDefaults.store}::profile`, profile)
      } else if (!profile) {
        setProfileCookie()
        this.profile = getProfileFromCookie()
        debug(`${BikeTagDefaults.store}::profile`, this.profile)
      }

      return this.profile
    },
    SET_GAME(game: any) {
      const oldState = this.game
      this.game = game
      this.fetchingData = true

      if (oldState?.name !== game?.name) {
        debug(`${BikeTagDefaults.store}::game`, { game })
      }

      return this.game
    },
    SET_ALL_GAMES(allGames: any) {
      const oldState = this.allGames
      this.allGames = allGames
      this.fetchingData = true

      if (oldState?.length !== allGames?.length) {
        debug(`${BikeTagDefaults.store}::all-games`, { allGames })
      }

      return this.allGames
    },
    SET_CURRENT_TAG(tag: any) {
      const oldState = this.currentBikeTag
      this.currentBikeTag = tag

      if (oldState?.tagnumber !== tag?.tagnumber) {
        debug(`${BikeTagDefaults.store}::current-bike-tag`, { tag })
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
        debug(`${BikeTagDefaults.store}::queued-tags`, { queuedTags })
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
        oldState?.foundLocation !== data?.foundLocation ||
        oldState?.foundPlayer !== data?.foundPlayer ||
        oldState?.tagnumber !== data?.tagnumber ||
        /// In case of a reset to this step
        oldState?.mysteryPlayer !== data?.foundPlayer
      ) {
        debug(`${BikeTagDefaults.store}::queued-found-tag`, this.playerTag)
        if (oldState?.mysteryPlayer !== data?.foundPlayer) {
          this.formStep = BiketagQueueFormSteps.roundJoined
        } else {
          this.formStep = BiketagQueueFormSteps.addFoundImage
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
        debug(`${BikeTagDefaults.store}::queued-mystery-tag`, this.playerTag)
        if (
          oldState?.discussionUrl !== data?.discussionUrl ||
          oldState?.mentionUrl !== data?.mentionUrl
        ) {
          this.formStep = BiketagQueueFormSteps.roundPosted
        } else {
          this.formStep = BiketagQueueFormSteps.addMysteryImage
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
        debug(`${BikeTagDefaults.store}::submitted-tag`, this.playerTag)
        this.formStep = BiketagQueueFormSteps.roundPosted
      }

      return this.playerTag
    },
    SET_QUEUED_TAG(data?: any) {
      const oldState = this.playerTag
      // setQueuedTagInCookie(data ? this.queuedTag : undefined)

      if (!data) {
        this.playerTag = {} as Tag
      } else if (
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
        this.playerTag = BikeTagClient.createTagObject(data ?? {}, data ? {} : this.playerTag)
        debug(`${BikeTagDefaults.store}::queued-tag`, this.playerTag)
      }

      return this.playerTag
    },
    SET_FORM_STEP_TO_JOIN(force: any) {
      const setQueudState = this.formStep !== BiketagQueueFormSteps.roundJoined || force
      const oldState = this.formStep
      if (setQueudState && this.playerTag) {
        this.formStep = getQueuedTagState(this.playerTag)
      } else {
        this.formStep = BiketagQueueFormSteps.roundJoined
      }

      if (oldState !== this.formStep) {
        debug(`${BikeTagDefaults.store}::queue-state`, BiketagQueueFormSteps[this.formStep])
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
        this.formStep = BiketagQueueFormSteps.shareBikeTagPost
      } else if (tag) {
        this.formStep = getQueuedTagState(tag)
      } else {
        this.formStep = BiketagQueueFormSteps.addFoundImage
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
      this.formStep = BiketagQueueFormSteps.addFoundImage
      debug(`${BikeTagDefaults.store}::queue-state`, BiketagQueueFormSteps[this.formStep])

      return this.formStep
    },
    RESET_FORM_STEP_TO_MYSTERY() {
      this.formStep = BiketagQueueFormSteps.addMysteryImage
      debug(`${BikeTagDefaults.store}::queue-state`, BiketagQueueFormSteps[this.formStep])

      return this.formStep
    },
    SET_REGION_POLYGON(regionPolygon: any) {
      this.regionPolygon = setRegionPolygonInCookie(regionPolygon, `${gameName}::regionPolygon`)

      return this.regionPolygon
    },
  },

  getters: {
    getAmbassadorId(state) {
      if (state.profile?.isBikeTagAmbassador) {
        return state.profile?.sub
      }
      return null
    },
    getImageSized: (state) => {
      return (url: string, s: string = 'm') =>
        getImageSized(state.imageSource, url, s as 's' | 'm' | 'l' | 'o' | undefined)
    },
    getImageSource(state) {
      return state.imageSource
    },
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

      return `https://biketag.org/${BikeTagDefaults.jingle}`
    },
    getGameTitle(state) {
      const gamePrefix = state.gameName?.length ? `${state.gameName?.toUpperCase()}.` : ''
      const gamePostfix = state.gameName?.length ? '' : '.ORG'
      return `${gamePrefix}BIKETAG${gamePostfix}`
    },
    getDefaultLogo() {
      return BikeTagDefaults.logo
    },
    getGameName(state) {
      return state.gameName
    },
    getGameNameProper(state) {
      return state.gameNameProper
    },
    getGameNameUrl(state) {
      return `https://${state.gameName}.biketag.org`
    },
    getLogoUrl(state) {
      return (size = '', logo?: string, squared = false) => {
        logo = logo ? logo : state.game?.logo?.length ? state.game?.logo : undefined

        if (!logo) {
          return BikeTagDefaults.logo
        }

        return logo.indexOf('imgur.com') !== -1
          ? logo
          : getSanityImageUrl(logo, size, BikeTagDefaults.sanityBaseCDNUrl, squared)
      }
    },
    getCurrentHint(state) {
      return state.currentBikeTag?.hint
    },
    getCurrentBikeTag(state) {
      return state.currentBikeTag
    },
    getPreviousBikeTag(state) {
      return state.tags.find((t) => t.tagnumber === state.currentBikeTag.tagnumber - 1)
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
      return BiketagQueueFormSteps[state.formStep]
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
    getGameNotices(state) {
      return {
        imgurDelayNotice: BikeTagEnv.IMGUR_DELAY_NOTICE,
        imgurDelay: BikeTagEnv.IMGUR_DELAY,
      }
    },
    isBikeTagAmbassador(state) {
      return !!state.profile?.isBikeTagAmbassador || isGlobalAdminEmail(state.profile?.email)
    },
    isBikeTagAdmin(state) {
      return !!state.profile?.isBikeTagAdmin || isGlobalAdminEmail(state.profile?.email)
    },
    canLaunchGame(state) {
      return (
        !!state.currentBikeTag &&
        'tagnumber' in state.currentBikeTag &&
        !state.currentBikeTag.tagnumber
      )
    },
  },
})

/// TODO: check to see if we can automatically call initBikeTagStore
export interface BikeTagStore extends ReturnType<typeof useBikeTagStore> {}
