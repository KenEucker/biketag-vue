import { Store } from 'vuex'
// import { TagData } from 'biketag/lib/common/types'

declare module '@vue/runtime-core' {
  // declare your own store states
  interface State {
    biketagLatest: {},
  }

  // provide typings for `this.$store`
  interface ComponentCustomProperties {
    $store: Store<State>
  }
}
