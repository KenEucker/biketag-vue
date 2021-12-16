import { InjectionKey } from 'vue'
import { createStore, Store } from 'vuex'
import axios from 'axios'
import biketag from 'biketag'
import { Game, Tag, Player } from 'biketag/lib/common/schema'
import { getDomainInfo } from '@/common/methods'

export interface State {
  game: Game
  gameName: string
  currentBikeTag: Tag
  tags: Tag[]
  players: Player[]
  html: string
  formStep: number
  queuedTag: Tag
}

// define injection key
export const key: InjectionKey<Store<State>> = Symbol()
const domain = getDomainInfo(undefined, window)
const gameName = domain.subdomain ?? (process.env.GAME_NAME as string)
const clientId = process.env.IMGUR_CLIENT_ID
const options: any = {
  game: gameName,
  /// TODO: remove these credentials and rely on the "biketag" api backend for retrieving game data (always)
  sanity: {
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET,
  },
}
const defaultLogo = '/images/BikeTag.svg'
const sanityBaseCDNUrl = `${process.env.SANITY_CDN_URL}${options.sanity?.projectId}/${options.sanity?.dataset}/`
console.log('store::init', { subdomain: domain.subdomain, domain, gameName })

let client = new biketag(options)

export const store = createStore<State>({
  state: {
    gameName,
    game: {} as Game,
    currentBikeTag: {} as Tag,
    tags: [] as Tag[],
    players: [] as Player[],
    html: '',
    formStep: 1,
    queuedTag: {} as Tag,
  },
  getters: {
    getGame(state) {
      return state.game
    },
    getGameSlug(state) {
      return state.game?.slug
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
    getLogoUrl:
      (state) =>
      (size = '') => {
        const logoUrl =
          state.game?.logo?.indexOf('imgur.com') !== -1
            ? state.game.logo
            : `${sanityBaseCDNUrl}${state.game.logo
                .replace('image-', '')
                .replace('-png', '.png')
                .replace('-jpg', '.jpg')}${size.length ? `?${size}` : ''}`
        return logoUrl ? logoUrl : Promise.resolve(defaultLogo)
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
    getPlayers(state) {
      return state.players
    },
    getFormStep(state) {
      return state.formStep
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
    SET_PLAYERS(state, players) {
      const oldState = state.players
      state.players = players

      if (oldState?.length !== players?.length) {
        console.log('store::players', { players })
      }
    },
    SET_QUEUE_FOUND(state, data) {
      const oldState = state.queuedTag
      state.queuedTag.foundImageUrl = data.foundImageUrl
      state.queuedTag.foundImage = data.foundImage
      state.queuedTag.foundLocation = data.foundLocation
      state.queuedTag.foundPlayer = data.foundPlayer

      if (
        oldState?.foundImageUrl !== data?.foundImageUrl ||
        oldState?.foundImage !== data?.foundImage ||
        oldState?.foundLocation !== data?.foundImageUrl ||
        oldState?.foundPlayer !== data?.foundPlayer
      ) {
        console.log('store::queuedTag', state.queuedTag)
      }
    },
    SET_QUEUE_MYSTERY(state, data) {
      const oldState = state.queuedTag
      state.queuedTag.mysteryImageUrl = data.mysteryImageUrl
      state.queuedTag.mysteryImage = data.mysteryImage
      state.queuedTag.hint = data.hint
      state.queuedTag.mysteryPlayer = state.queuedTag.foundPlayer

      if (
        oldState?.mysteryImageUrl !== data?.mysteryImageUrl ||
        oldState?.mysteryImage !== data?.mysteryImage ||
        oldState?.hint !== data?.hint ||
        oldState?.mysteryPlayer !== data?.mysteryPlayer
      ) {
        console.log('store::queuedTag', state.queuedTag)
      }
    },
    SET_QUEUED_TAG(state, data) {
      const oldState = state.queuedTag
      state.queuedTag.mysteryImageUrl = data.mysteryImageUrl
      state.queuedTag.mysteryImage = data.mysteryImage
      state.queuedTag.hint = data.hint
      state.queuedTag.mysteryPlayer = state.queuedTag.foundPlayer
      state.queuedTag.foundImageUrl = data.foundImageUrl
      state.queuedTag.foundImage = data.foundImage
      state.queuedTag.foundLocation = data.foundLocation
      state.queuedTag.foundPlayer = data.foundPlayer

      if (
        oldState?.mysteryImageUrl !== data?.mysteryImageUrl ||
        oldState?.mysteryImage !== data?.mysteryImage ||
        oldState?.hint !== data?.hint ||
        oldState?.mysteryPlayer !== data?.mysteryPlayer ||
        oldState?.foundImageUrl !== data?.foundImageUrl ||
        oldState?.foundImage !== data?.foundImage ||
        oldState?.foundLocation !== data?.foundImageUrl ||
        oldState?.foundPlayer !== data?.foundPlayer
      ) {
        console.log('store::queuedTag', state.queuedTag)
      }
    },
    RESET_FORM_STEP(state) {
      state.formStep = 1
    },
    INC_FORM_STEP(state) {
      state.formStep++
    },
    DEC_FORM_STEP(state) {
      state.formStep++
    },
  },
  actions: {
    setGame({ commit, state }) {
      return client.game(state.gameName, { source: 'sanity' }).then((d) => {
        options.imgur = { clientId, hash: (d as Game).mainhash }
        client = new biketag(options)
        return commit('SET_GAME', d)
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
    setPlayers({ commit }) {
      return client.players().then((d) => {
        return commit('SET_PLAYERS', d)
      })
    },
    setTopPlayers({ commit }) {
      return client.players({ sort: 'top' }).then((d) => {
        return commit('SET_PLAYERS', d)
      })
    },
    setQueueFound({ commit }, d) {
      return commit('SET_QUEUE_FOUND', d)
    },
    setQueuedTag({ commit }, d) {
      return commit('SET_QUEUED_TAG', d)
    },
    setQueueMystery({ commit }, d) {
      return commit('SET_QUEUE_MYSTERY', d)
    },
    incFormStep({ commit }) {
      return commit('INC_FORM_STEP')
    },
    decFormStep({ commit }) {
      return commit('DEC_FORM_STEP')
    },
    resetFormStep({ commit }) {
      return commit('RESET_FORM_STEP')
    },
    setHtml({ commit }, file) {
      return axios.get('./' + file).then((r) => {
        return commit('SET_HTML', r.data)
      })
    },
  },
  modules: {},
})
