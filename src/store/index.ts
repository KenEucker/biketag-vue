import { InjectionKey } from 'vue'
import { createStore, Store } from 'vuex'
import axios from 'axios'
import biketag from 'biketag'
import { Game, Tag, Player } from 'biketag/lib/common/schema'

// define your typings for the store state
export interface State {
  game: Game
  gametitle: string
  biketagLatest: Tag
  allTags: Tag[]
  players: Player[]
  html: string
  formStep: number
}

// define injection key
export const key: InjectionKey<Store<State>> = Symbol()

const gamename = 'portland'
const options = {
  game: gamename,
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
const sanityBaseCDNUrl = `https://cdn.sanity.io/images/${options.sanity?.projectId ?? 'x37ikhvs'}/${
  options.sanity?.dataset ?? 'production'
}/`

export const store = createStore<State>({
  state: {
    game: {} as Game,
    gametitle: 'PORTLAND.BIKETAG',
    biketagLatest: {} as Tag,
    allTags: [] as Tag[],
    players: [] as Player[],
    html: '',
    formStep: 1,
  },
  getters: {
    getGame(state) {
      return state.game
    },
    getTitle(state) {
      return state.gametitle
    },
    getLogoUrl(state) {
      return state.game.logo
        ? `${sanityBaseCDNUrl}${state.game.logo
            .replace('image-', '')
            .replace('-png', '.png')
            .replace('-jpg', '.jpg')}`
        : require('@/assets/images/SpinningBikeV1.svg')
    },
    getLastTag(state) {
      return state.biketagLatest
    },
    getAllTags(state) {
      return state.allTags
    },
    getAllPlayers(state) {
      return state.players
    },
    getFormStep(state) {
      return state.formStep
    },
  },
  mutations: {
    SET_GAME_DATA(state, game) {
      state.game = game
      console.log({ game })
    },
    SET_LAST_TAG(state, tag) {
      state.biketagLatest = tag
      console.log({ tag })
    },
    SET_ALL_TAGS(state, tags) {
      state.allTags = tags
      console.log({ tags })
    },
    SET_HTML(state, html) {
      state.html = html
      console.log({ html })
    },
    SET_ALL_PLAYERS(state, players) {
      state.players = players
      console.log({ players })
    },
    INT_FORM_STEP(state) {
      state.formStep++
    },
    DEC_FORM_STEP(state) {
      state.formStep++
    },
  },
  actions: {
    setGame({ commit }) {
      client.game('portland').then((d) => {
        commit('SET_GAME_DATA', d)
      })
    },
    setLastTag({ commit }) {
      client.getTag().then((r) => {
        commit('SET_LAST_TAG', r.data)
      })
    },
    setAllTags({ commit }) {
      client.tags().then((d) => {
        commit('SET_ALL_TAGS', d)
      })
    },
    setAllPlayers({ commit }) {
      client.players().then((d) => {
        commit('SET_ALL_PLAYERS', d)
      })
    },
    setTopPlayers({ commit }) {
      client.players({ sort: 'top' }).then((d) => {
        commit('SET_ALL_PLAYERS', d)
      })
    },
    incFormStep({ commit }) {
      commit('INT_FORM_STEP')
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
