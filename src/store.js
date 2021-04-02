import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    username: localStorage.username,
    id: localStorage.id,
    token: localStorage.token,
    targetUser: localStorage.targetUser,
  },
  mutations: {
    setUser() {
      this.state.username = localStorage.username;
      this.state.id = localStorage.id;
      this.state.token = localStorage.token;
    },
    targetUser() {
      this.state.targetUser = localStorage.targetUser;
    },
  },
  actions: {

  },
});
