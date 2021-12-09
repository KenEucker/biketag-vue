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
  allTags: Tag[]
  players: Player[]
  html: string
  formStep: number
  queuedTag: Tag
}

// define injection key
export const key: InjectionKey<Store<State>> = Symbol()
const domain = getDomainInfo(undefined, window)
const gameName = domain.subdomain ?? 'portland'
console.log({ subdomain: domain.subdomain, domain, gameName })

const options = {
  game: gameName,
  imgur: {
    hash: 'Y9PKtpI',
    clientId: '4fa12c6ce36984b',
  },
  sanity: {
    projectId: 'x37ikhvs',
    dataset: 'production',
  },
}

const client = new biketag(options)
// const sanityBaseCDNUrl = `https://cdn.sanity.io/images/${options.sanity?.projectId ?? 'x37ikhvs'}/${
//   options.sanity?.dataset ?? 'production'
// }/`

export const store = createStore<State>({
  state: {
    gameName,
    game: {} as Game,
    currentBikeTag: {} as Tag,
    allTags: [] as Tag[],
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
      return state.game.logo ? state.game.logo : require('@/assets/images/pdx-bike-tag-small.png')
    },
    getCurrentBikeTag(state) {
      return state.currentBikeTag
    },
    getTags(state) {
      return state.allTags
    },
    getPlayers(state) {
      return state.players
    },
    getFormStep(state) {
      return state.formStep
    },
  },
  mutations: {
    SET_GAME(state, game) {
      state.game = game
      console.log({ game })
    },
    SET_CURRENT_TAG(state, tag) {
      state.currentBikeTag = tag
      console.log({ tag })
    },
    SET_TAGS(state, tags) {
      state.allTags = tags
      console.log({ tags })
    },
    SET_HTML(state, html) {
      state.html = html
      console.log({ html })
    },
    SET_PLAYERS(state, players) {
      state.players = players
      console.log({ players })
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
        client.config({ imgur: { hash: (d as Game).mainhash } }, true)
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
    incFormStep({ commit }) {
      commit('INC_FORM_STEP')
    },
    decFormStep({ commit }) {
      commit('DEC_FORM_STEP')
    },
    setHtml({ commit }, file) {
      axios.get('./' + file).then((r) => {
        commit('SET_HTML', r.data)
      })
    },
  },
  modules: {},
})
