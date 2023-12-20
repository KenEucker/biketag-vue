<template>
  <div
    ref="el"
    class="expandable-image"
    :class="{
      expanded: expanded,
    }"
    @click="expandClick"
  >
    <Loading v-if="loading" v-model:active="loading" :is-full-page="true">
      <img class="spinner" src="@/assets/images/SpinningBikeV1.svg" alt="loading..." />
    </Loading>
    <img
      v-show="!loading"
      :src="imgSrc"
      class="img-fluid"
      v-bind="$attrs"
      :alt="imgSrc"
      @load="loaded"
    />
    <i v-show="expanded" class="close-button">
      <img src="@/assets/images/close.svg" alt="close" />
    </i>
  </div>
</template>

<script setup name="ExpandableImage" type="ts">
import { ref, watch, computed, nextTick } from 'vue'

// components
import Loading from 'vue-loading-overlay'

// props
const props = defineProps({
  source: {
    type: String,
    default: null,
  },
  fullSource: {
    type: String,
    default: null,
  },
})

// data
const emit = defineEmits(['loading', 'loaded'])
const expanded = ref(false)
const loading = ref(emit('loading') && true)
const el = ref(null)
const cloned = ref(null)
const closeButtonRef = ref(null)

const imgSrc = computed(() => expanded.value ?  props.fullSource :  props.source)

// methods
const expandClick = () => expanded.value = true
const shrinkImage = () => expanded.value = false
const doCloseImage = event => {
  const key = event.key.toLowerCase()
  if ( key === 'escape' || key === 'backspace') {
    shrinkImage()
  }
}
const closeImage = event => {
  expanded.value = false
  document.removeEventListener('keydown', doCloseImage)
  document.removeEventListener('backbutton', doCloseImage)
  document.addEventListener('gesturestart', function() { /* */ });
  event.stopPropagation()
}
const loaded = () => {
  emit('loaded')
  loading.value = false
}

// watch
watch(
  expanded,
  (val) => {
    nextTick(() => {
      if (val) {
        cloned.value = el.value.cloneNode(true)
        closeButtonRef.value = cloned.value.querySelector('.close-button')
        closeButtonRef.value.addEventListener('click', closeImage)

        cloned.value.addEventListener('click', function doCloseImageBackground(event) {
          if(event.target==el.value) {
            closeImage(event)
          }
        })
        document.addEventListener('keydown', doCloseImage)
        document.addEventListener('backbutton', doCloseImage)
        document.body.appendChild(cloned.value)
        document.body.style.overflow = 'hidden'
        setTimeout(() => {
          cloned.value.style.opacity = 1
        }, 0)
      } else {
        cloned.value.style.opacity = 0
            setTimeout(() => {
              closeButtonRef.value.removeEventListener('click', closeImage)
              cloned.value.remove()
              cloned.value = null
              closeButtonRef.value = null
              document.body.style.overflow = 'auto'
            }, 250)
      }
    })
})
</script>

<style scoped lang="scss">
.close-button {
  position: fixed;
  top: 15px;
  right: 15px;
  display: none;
  cursor: pointer;
}

.expandable-image {
  cursor: zoom-in;
  position: relative;
  transition: 0.25s opacity;
}

.close-button img {
  width: 3em;
  height: 3em;
  filter: invert(1);
}

body {
  .expanded {
    cursor: initial;
    position: fixed;
    z-index: 99999;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgb(0 0 0 / 60%);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 1;
    padding-bottom: 0 !important;

    img {
      z-index: 999999;
      max-height: 100%;
      object-fit: contain;
      margin: 0;
    }
  }

  .close-button {
    display: block;
    z-index: 999999;
  }
}

svg {
  filter: drop-shadow(1px 1px 1px rgb(0 0 0 / 50%));
}

svg path {
  fill: #fff;
}

.expand-button {
  position: absolute;
  z-index: 999;
  right: 10px;
  top: 10px;
  align-items: center;
  justify-content: center;
  padding: 3px;
  opacity: 0;
  transition: 0.2s opacity;
}

.expandable-image:hover .expand-button {
  opacity: 1;
}

.expand-button svg {
  width: 20px;
  height: 20px;
}

.expand-button path {
  fill: #fff;
}
</style>
