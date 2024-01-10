import { App, Plugin } from 'vue'

import { BikeTagDefaults, BikeTagEnv } from './common/constants'
import * as Types from './common/types'
import { getBikeTagClientOpts } from './common/utils'
import { BikeTagStore, initBikeTagStore, useBikeTagStore } from './store'

import { dynamicFontDirective } from './directives'

// import BikeDex from './components/BikeDex.vue'
// import BikeTag from './components/BikeTag.vue'
// import BikeTagAchievement from './components/BikeTagAchievement.vue'
// import ExpandableImage from './components/ExpandableImage.vue'
import BikeTagBlurb from './components/BikeTagBlurb.vue'
import BikeTagButton from './components/BikeTagButton.vue'
// import BikeTagCamera from './components/BikeTagCamera.vue'
// import BikeTagFooter from './components/BikeTagFooter.vue'
// import BikeTagGames from './components/BikeTagGames.vue'
import BikeTagHeader from './components/BikeTagHeader.vue'
// import BikeTagInput from './components/BikeTagInput.vue'
import BikeTagLabel from './components/BikeTagLabel.vue'
// import BikeTagLoader from './components/BikeTagLoader.vue'
// import BikeTagMap from './components/BikeTagMap.vue'
// import BikeTagMenu from './components/BikeTagMenu.vue'
// import BikeTagPlayer from './components/BikeTagPlayer.vue'
// import BikeTagQueue from './components/BikeTagQueue.vue'

export interface BikeTagPlugin {
  install: (app: App) => void
  useBikeTagStore: () => BikeTagStore
}

const createBikeTag = (
  options = {
    includeComponents: true,
    includeDirectives: true,
  },
): BikeTagPlugin => {
  initBikeTagStore()

  const install: Plugin = (app: App) => {
    if (options.includeComponents) {
      app
        .component('BikeTagBlurb', BikeTagBlurb)
        .component('BikeTagHeader', BikeTagHeader)
        .component('BikeTagButton', BikeTagButton)
    }
    if (options.includeDirectives) {
      app.directive('dynamic-font', dynamicFontDirective)
    }
  }

  return { install, useBikeTagStore }
}

export {
  // ExpandableImage
  BikeTagBlurb,
  // BikeTagAchievement,
  BikeTagButton,
  BikeTagDefaults,
  // BikeTag,
  // BikeDex,
  BikeTagEnv,
  // BikeTagCamera,
  // BikeTagFooter,
  // BikeTagGames,
  BikeTagHeader,
  // BikeTagInput,
  BikeTagLabel,
  // BikeTagLoader,
  // BikeTagMap,
  // BikeTagMenu,
  // BikeTagPlayer,
  // BikeTagQueue,
  Types,
  createBikeTag,
  getBikeTagClientOpts,
  initBikeTagStore,
  useBikeTagStore,
}
