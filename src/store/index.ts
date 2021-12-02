import { InjectionKey } from 'vue'
import { createStore, Store } from 'vuex'
import axios from 'axios'
import biketag from 'biketag'
import { Tag, Player } from 'biketag/lib/common/types'
import { getPlayersPayload } from 'biketag/lib/common/payloads'

// define your typings for the store state
export interface State {
  gametitle: string
  logourl: string
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

const biketagAPI = new biketag(options)

export const store = createStore<State>({
  state: {
    gametitle: 'PORTLAND.BIKETAG',
    logourl: require('@/assets/images/SpinningBikeV1.svg'),
    biketagLatest: {} as Tag,
    allTags: [] as Tag[],
    players: [] as Player[],
    html: '',
    formStep: 1,
  },
  getters: {
    getTitle(state) {
      return state.gametitle
    },
    getLogoUrl(state) {
      return state.logourl
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
    SET_LAST_TAG(state, biketag) {
      state.biketagLatest = biketag
      console.log(biketag)
    },
    SET_ALL_TAGS(state, biketags) {
      state.allTags = biketags
      console.log(biketags)
    },
    SET_HTML(state, html) {
      state.html = html
      console.log(html)
    },
    SET_ALL_PLAYERS(state, players) {
      state.players = players
      console.log(players)
    },
    INT_FORM_STEP(state) {
      state.formStep++
    },
    DEC_FORM_STEP(state) {
      state.formStep++
    },
  },
  actions: {
    async setLastTag({ commit }) {
      await biketagAPI.getTag().then((res) => {
        commit('SET_LAST_TAG', res.data)
      })
    },
    async setAllTags({ commit }) {
      await biketagAPI.getTags().then((res) => {
        commit('SET_ALL_TAGS', res.data)
      })
    },
    async setAllPlayers({ commit }) {
      await biketagAPI.getPlayers().then((res) => {
        commit('SET_ALL_PLAYERS', res.data)
      })
    },
    async setTopPlayers({ commit }) {
      await biketagAPI.getPlayers({ sort: 'top' } as getPlayersPayload).then((res) => {
        commit('SET_ALL_PLAYERS', res.data)
      })
    },
    incFormStep({ commit }) {
      commit('INT_FORM_STEP')
    },
    decFormStep({ commit }) {
      commit('DEC_FORM_STEP')
    },
    setHtml({ commit }, payload) {
      axios.get('./' + payload).then((res) => {
        commit('SET_HTML', res.data)
      })
    },
  },
  modules: {},
})
