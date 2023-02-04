<template>
  <div
    ref="root"
    class="expandable-image"
    :class="{
      expanded: expanded,
    }"
  >
    <b-spinner v-show="loading" />
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
import { defineProps, defineEmits, ref} from 'vue'

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
const root = ref(null)

// methods
function expandClick() {
  if (!expanded.value) {
    document.addEventListener('keydown', doCloseImage)
    document.addEventListener('backbutton', doCloseImage)
    expanded.value = true
  }
}
function shrinkImage() {
  if (expanded.value) {
    document.removeEventListener('keydown', doCloseImage)
    document.removeEventListener('backbutton', doCloseImage)
    expanded.value = false
  }
}
function doCloseImage(event) {
  event.stopPropagation()
  const key = event.key.toLowerCase()
  if ( key === 'escape' || key === 'backspace') {
    shrinkImage()
  }
}
function loaded() {
  emit('loaded')
  loading.value = false
}
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
    opacity: 1;
    padding-bottom: 0 !important;
    cursor: zoom-out;

    img {
      z-index: 999999;
      max-height: 100%;
      object-fit: contain;
      margin: 0 auto;
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
