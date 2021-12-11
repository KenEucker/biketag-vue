import { InjectionKey } from 'vue'
import { createStore, Store } from 'vuex'
import axios from 'axios'
import biketag from 'biketag'
import { Game, Tag, Player } from 'biketag/lib/common/schema'
import { getDomainInfo } from '@/common/methods'

// define your typings for the store state
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
const gameName = domain.subdomain ?? 'portland'
const clientId = '4fa12c6ce36984b'
const options: any = {
  game: gameName,
  sanity: {
    projectId: 'x37ikhvs',
    dataset: 'production',
  },
}
const sanityBaseCDNUrl = `https://cdn.sanity.io/images/${options.sanity?.projectId}/${options.sanity?.dataset}/`
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
    getTitle(state) {
      return `${state.gameName.toUpperCase()}.BIKETAG`
    },
    getLogoUrl(state) {
      const logoUrl =
        state.game?.logo?.indexOf('imgur.com') !== -1
          ? state.game.logo
          : `${sanityBaseCDNUrl}${state.game.logo
              .replace('image-', '')
              .replace('-png', '.png')
              .replace('-jpg', '.jpg')}`
      return logoUrl ? logoUrl : import('@/assets/images/pdx-bike-tag-small.png')
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
      state.game = game
      console.log('store::game', { game })
    },
    SET_CURRENT_TAG(state, tag) {
      state.currentBikeTag = tag
      console.log('store::currentBikeTag', { tag })
    },
    SET_TAGS(state, tags) {
      state.tags = tags
      console.log('store::tags', { tags })
    },
    SET_HTML(state, html) {
      state.html = html
      console.log('store::html', { html })
    },
    SET_PLAYERS(state, players) {
      state.players = players
      console.log('store::players', { players })
    },
    SET_QUEUE_FOUND(state, data) {
      state.queuedTag.foundImageUrl = data.foundImageUrl
      state.queuedTag.foundImage = data.foundImage
      state.queuedTag.foundLocation = data.foundLocation
      state.queuedTag.foundPlayer = data.foundPlayer
      console.log('store::queuedTag', state.queuedTag)
    },
    SET_QUEUE_MYSTERY(state, data) {
      state.queuedTag.mysteryImageUrl = data.mysteryImageUrl
      state.queuedTag.mysteryImage = data.mysteryImage
      state.queuedTag.hint = data.hint
      state.queuedTag.mysteryPlayer = state.queuedTag.foundPlayer
      console.log('store::queuedTag', state.queuedTag)
    },
    SET_QUEUED_TAG(state, data) {
      state.queuedTag.mysteryImageUrl = data.mysteryImageUrl
      state.queuedTag.mysteryImage = data.mysteryImage
      state.queuedTag.hint = data.hint
      state.queuedTag.mysteryPlayer = state.queuedTag.foundPlayer
      state.queuedTag.foundImageUrl = data.foundImageUrl
      state.queuedTag.foundImage = data.foundImage
      state.queuedTag.foundLocation = data.foundLocation
      state.queuedTag.foundPlayer = data.foundPlayer
      console.log('store::queuedTag', state.queuedTag)
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
      return client.game(state.gameName).then((d) => {
        options.imgur = { clientId, hash: (d as Game).mainhash }
        client = new biketag(options)
        commit('SET_GAME', d)
      })
    },
    setCurrentBikeTag({ commit }) {
      return client.getTag().then((r) => {
        commit('SET_CURRENT_TAG', r.data)
      })
    },
    setTags({ commit }) {
      return client.tags().then((d) => {
        commit('SET_TAGS', d)
      })
    },
    setPlayers({ commit }) {
      return client.players().then((d) => {
        commit('SET_PLAYERS', d)
      })
    },
    setTopPlayers({ commit }) {
      return client.players({ sort: 'top' }).then((d) => {
        commit('SET_PLAYERS', d)
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
      commit('INC_FORM_STEP')
    },
    decFormStep({ commit }) {
      commit('DEC_FORM_STEP')
    },
    resetFormStep({ commit }) {
      commit('RESET_FORM_STEP')
    },
    setHtml({ commit }, file) {
      axios.get('./' + file).then((r) => {
        commit('SET_HTML', r.data)
      })
    },
  },
  modules: {},
})
