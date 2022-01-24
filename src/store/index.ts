import { InjectionKey } from 'vue'
import { createStore, Store } from 'vuex'
import axios from 'axios'
import biketag from 'biketag'
import { Game, Tag, Player } from 'biketag/lib/common/schema'
import { BikeTagApiResponse, ImgurCredentials } from 'biketag/lib/common/types'
import { getDomainInfo, getImgurImageSized, getUuid, getIpInformation } from '@/common/utils'

export interface State {
  game: Game
  gameName: string
  playerId: string
  currentBikeTag: Tag
  tags: Tag[]
  queuedTags: Tag[]
  players: Player[]
  leaderboard: Player[]
  html: string
  formStep: number
  queuedTag: Tag
}

export enum BiketagFormSteps {
  queueView = 1,
  queueFound = 2,
  queueJoined = 3,
  queueMystery = 4,
  queueSubmit = 5,
  queuePosted = 6,
}

// define injection key
export const key: InjectionKey<Store<State>> = Symbol()
const domain = getDomainInfo(undefined, window)
const playerId = getUuid()
// const ipInfo = await getIpInformation()
const gameName = domain.subdomain ?? process.env.GAME_NAME ?? ''

const imgurCredentials: ImgurCredentials = {
  clientId: process.env.IMGUR_CLIENT_ID ?? '',
  // clientSecret: process.env.IMGUR_CLIENT_SECRET,
  // accessToken: process.env.IMGUR_ACCESS_TOKEN,
  // refreshToken: process.env.IMGUR_REFRESH_TOKEN,
}
const options: any = {
  game: gameName,
  accessToken: process.env.ACCESS_TOKEN,
  // imgur: {
  //   clientId: process.env.IMGUR_CLIENT_ID ?? '',
  // },
  sanity: {
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET,
  },
}
const defaultLogo = '/images/BikeTag.svg'
const sanityBaseCDNUrl = `${process.env.SANITY_CDN_URL}${options.sanity?.projectId}/${options.sanity?.dataset}/`
console.log('store::init', { subdomain: domain.subdomain, domain, gameName, playerId })

let client = new biketag(options)

export const store = createStore<State>({
  state: {
    gameName,
    game: {} as Game,
    currentBikeTag: {} as Tag,
    tags: [] as Tag[],
    playerId,
    queuedTags: [] as Tag[],
    players: [] as Player[],
    leaderboard: [] as Player[],
    html: '',
    formStep: BiketagFormSteps.queueView,
    queuedTag: {} as Tag,
  },
  getters: {
    getImgurImageSized: () => getImgurImageSized,
    getGame(state) {
      return state.game
    },
    getGameSlug(state) {
      return state.game?.slug
    },
    getPlayerId(state) {
      return state.playerId
    },
    getGameSettings(state) {
      return state.game?.settings
    },
    getEasterEgg(state) {
      if (state.game?.settings) {
        const jingle = state.game?.settings['easter::jingle']
        return jingle ? `https://biketag.org/public/${jingle}` : null
      }
      return null
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
            : `${sanityBaseCDNUrl}${state.game.logo
              .replace('image-', '')
              .replace('-png', '.png')
              .replace('-jpg', '.jpg')}${size.length ? `?${size}` : ''}`
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
    SET_HTML(state, html) {
      const oldState = state.html
      state.html = html

      if (oldState?.length !== html?.length) {
        console.log('store::html', { html })
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
      state.queuedTag.foundImageUrl = data.foundImageUrl
      state.queuedTag.foundImage = data.foundImage
      state.queuedTag.foundLocation = data.foundLocation
      state.queuedTag.foundPlayer = data.foundPlayer
      state.queuedTag.tagnumber = data.tagnumber

      if (
        oldState?.foundImageUrl !== data?.foundImageUrl ||
        oldState?.foundImage !== data?.foundImage ||
        oldState?.foundLocation !== data?.foundImageUrl ||
        oldState?.foundPlayer !== data?.foundPlayer ||
        oldState?.tagnumber !== data?.tagnumber
      ) {
        console.log('store::queuedFoundTag', state.queuedTag)
        state.formStep = BiketagFormSteps.queueJoined
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
    SET_QUEUE_MYSTERY(state, data) {
      const oldState = state.queuedTag
      state.queuedTag.mysteryImageUrl = data.mysteryImageUrl
      state.queuedTag.mysteryImage = data.mysteryImage
      state.queuedTag.hint = data.hint
      state.queuedTag.mysteryPlayer = data.mysteryPlayer ?? state.queuedTag.foundPlayer
      state.queuedTag.tagnumber = data.tagnumber

      if (
        oldState?.mysteryImageUrl !== data?.mysteryImageUrl ||
        oldState?.mysteryImage !== data?.mysteryImage ||
        oldState?.hint !== data?.hint ||
        oldState?.mysteryPlayer !== data?.mysteryPlayer ||
        oldState?.tagnumber !== data?.tagnumber
      ) {
        console.log('store::queuedMysteryTag', state.queuedTag)
      }
    },
    SET_QUEUED_TAG(state, data) {
      const oldState = state.queuedTag
      state.queuedTag.mysteryImageUrl = data.mysteryImageUrl
      state.queuedTag.mysteryImage = data.mysteryImage
      state.queuedTag.hint = data.hint
      state.queuedTag.mysteryPlayer = data.mysteryPlayer
      state.queuedTag.foundImageUrl = data.foundImageUrl
      state.queuedTag.foundImage = data.foundImage
      state.queuedTag.foundLocation = data.foundLocation
      state.queuedTag.foundPlayer = data.foundPlayer
      state.queuedTag.tagnumber = data.tagnumber

      if (
        oldState?.mysteryImageUrl !== data?.mysteryImageUrl ||
        oldState?.mysteryImage !== data?.mysteryImage ||
        oldState?.hint !== data?.hint ||
        oldState?.mysteryPlayer !== data?.mysteryPlayer ||
        oldState?.foundImageUrl !== data?.foundImageUrl ||
        oldState?.foundImage !== data?.foundImage ||
        oldState?.foundLocation !== data?.foundImageUrl ||
        oldState?.foundPlayer !== data?.foundPlayer ||
        oldState?.tagnumber !== data?.tagnumber
      ) {
        console.log('store::queuedTag', state.queuedTag)
      }
    },
    SET_FORM_STEP_TO_JOIN(state, force) {
      state.formStep =
        state.formStep !== BiketagFormSteps.queueJoined || force
          ? state.queuedTag?.mysteryImageUrl?.length > 0
            ? BiketagFormSteps.queueSubmit
            : state.queuedTag?.foundImageUrl?.length > 0
              ? BiketagFormSteps.queueMystery
              : BiketagFormSteps.queueFound
          : BiketagFormSteps.queueJoined

      // console.log(`queue state:: ${BiketagFormSteps[state.formStep]}`)
    },
    RESET_FORM_STEP(state) {
      state.formStep =
        state.queuedTags?.length > 0 ? BiketagFormSteps.queueView : BiketagFormSteps.queueFound
      // console.log(`queue state:: ${BiketagFormSteps[state.formStep]}`)
    },
    RESET_FORM_STEP_TO_FOUND(state) {
      state.formStep = BiketagFormSteps.queueFound
      // console.log(`queue state:: ${BiketagFormSteps[state.formStep]}`)
    },
    RESET_FORM_STEP_TO_MYSTERY(state) {
      state.formStep = BiketagFormSteps.queueMystery
      // console.log(`queue state:: ${BiketagFormSteps[state.formStep]}`)
    },
  },
  actions: {
    setGame({ commit, state }) {
      if (!options.imgur) {
        return client.game(state.gameName).then((d) => {
          const game = d as Game
          imgurCredentials.hash = game.mainhash ?? imgurCredentials.hash
          imgurCredentials.queuehash = imgurCredentials.queuehash ?? game.queuehash
          options.imgur = imgurCredentials

          client = new biketag(options)
          return commit('SET_GAME', game)
        })
      }
    },
    setCurrentBikeTag({ commit }) {
      return client.getTag().then((r: BikeTagApiResponse<Tag>) => {
        return commit('SET_CURRENT_TAG', r.data)
      })
    },
    setTags({ commit }) {
      return client.tags().then((d) => {
        return commit('SET_TAGS', d)
      })
    },
    setQueuedTags({ commit, state }, reset) {
      return client.queue().then((d) => {
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
      })
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
    resetFormStep({ commit }) {
      return commit('RESET_FORM_STEP')
    },
    setFormStepToJoin({ commit, state }, d) {
      if (state.formStep === BiketagFormSteps.queueView || d) {
        return commit('SET_FORM_STEP_TO_JOIN', d)
      }
      return true
    },
    async queueFoundTag({ commit }, d) {
      console.log('queueFoundTag')
      if (d.foundImage && !d.foundImageUrl) {
        d.playerId = playerId
        return client.queueTag(d).then((t) => {
          if (t.success) {
            commit('SET_QUEUE_FOUND', t.data)
          } else {
            console.log('queue BikeTag failed', t)
            console.log('returning', t.error)
            return t.error
          }
          return t.success
        })
      }
      return commit('SET_QUEUE_FOUND', d)
    },
    async queueMysteryTag({ commit }, d) {
      console.log('queueMysteryTag')
      if (d.mysteryImage && !d.mysteryImageUrl) {
        d.playerId = playerId
        return client.queueTag(d).then((t) => {
          if (t.success) {
            commit('SET_QUEUE_MYSTERY', t.data)
          } else {
            console.log('queue BikeTag failed', t)
            console.log('returning', t.error)
            return t.error
          }
          console.log('NOOOO', t.success)
          return t.success
        })
      }
      return commit('SET_QUEUE_MYSTERY', d)
    },
    async resetFormStepToFound({ commit }) {
      await commit('SET_QUEUED_TAG', {})
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
    async submitQueuedTag({ commit }, d) {
      return commit('SET_QUEUED_SUBMITTED', d)
    },
    setHtml({ commit }, file) {
      return axios.get('./' + file).then((r) => {
        return commit('SET_HTML', r.data)
      })
    },
  },
  modules: {},
})
