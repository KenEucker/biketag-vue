<template>
  <div
    class="expandable-image"
    :class="{
      expanded: expanded,
    }"
  >
    <Loading v-if="loading" v-model:active="loading" :is-full-page="true">
      <img class="spinner" src="@/assets/images/SpinningBikeV1.svg" />
    </Loading>
    <div v-show="!loading">
      <img
        v-show="!expanded"
        :src="props.source"
        class="img-fluid"
        v-bind="$attrs"
        @click="expandClick"
        @load="loaded"
      />
      <img
        v-show="expanded"
        :src="props.fullSource"
        class="img-fluid"
        v-bind="$attrs"
        @load="loaded"
      />
    </div>
    <i v-if="expanded" class="close-button" @click="shrinkImage">
      <img src="@/assets/images/close.svg" />
    </i>
  </div>
</template>

<script setup name="ExpandableImage" type="ts">
import { defineProps, defineEmits, ref, watch } from 'vue'

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

// methods
const expandClick = () => expanded.value = true
const shrinkImage = () => expanded.value = false
const doCloseImage = event => {
  const key = event.key.toLowerCase()
  if ( key === 'escape' || key === 'backspace') {
    shrinkImage()
  }
}
const loaded = () => {
  emit('loaded')
  loading.value = false
}

// watch
watch(
  () => expanded.value,
  (val) => {
    if (!val) {
      document.removeEventListener('keydown', doCloseImage)
      document.removeEventListener('backbutton', doCloseImage)
    } else {
      document.addEventListener('keydown', doCloseImage)
      document.addEventListener('backbutton', doCloseImage)
  }
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
  position: relative;
  transition: 0.25s opacity;
  cursor: zoom-in;

  img {
    width: 100%;
  }
}

.close-button img {
  width: 3em;
  height: 3em;
  filter: invert(1);
}

body {
  .expanded {
    position: fixed;
    z-index: 99999;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgb(0 0 0 / 90%);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 1;
    padding-bottom: 0 !important;
    cursor: zoom-out;

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
