<template>
  <div
    ref="root"
    class="expandable-image"
    :class="{
      expanded: expanded,
    }"
    @click="expandClick"
  >
    <b-spinner v-show="loading" />
    <img v-show="!loading" :src="imgSrc" class="img-fluid" v-bind="$attrs" @load="loaded" />
    <i v-if="expanded" class="close-button">
      <img src="@/assets/images/close.svg" />
    </i>
  </div>
</template>

<script setup name="ExpandableImage" type="ts">
import { defineProps, defineEmits, ref, computed, watch, nextTick } from 'vue'

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
const closeButtonRef =  ref(null)
const loading = ref(emit('loading') && true)
const root = ref(null)
const cloned = ref(null)

// computed
const imgSrc = computed(() => expanded.value ? props.fullSource : props.source)

// methods
function expandClick() {
  expanded.value = true
}
function doCloseImage(event) {
  if (event.key.toLowerCase() == 'escape') {
    closeImage(event)
  }
}
function closeImage(event) {
  expanded.value = false
  document.removeEventListener('keydown', doCloseImage)
  document.removeEventListener('backbutton', doCloseImage)
  document.addEventListener('gesturestart', function() { /* */ });
  event.stopPropagation()
}
// function freezeVp(e) {
//   e.preventDefault()
// }
function loaded() {
  emit('loaded')
  loading.value = false
}

// watch
watch(() => {
  expanded.value, status => {
    nextTick(() => {
      if (status) {
        const closeImageMethod = closeImage
        cloned.value = root.value.cloneNode(true)
        closeButtonRef.value = cloned.value.querySelector('.close-button')
        closeButtonRef.value.addEventListener('click', closeImage)
        // const clonedImg = cloned.value.querySelector('img')
        // console.log({clonedImg})
        // clonedImg.addEventListener('click', (e) => e.stopPropagation())
        cloned.value.addEventListener('click', function doCloseImageBackground(event) {
          if(event.target==this) {
            closeImageMethod(event)
          }
        })
        document.addEventListener('keydown', doCloseImage)
        document.addEventListener('backbutton', doCloseImage)
        document.body.appendChild(cloned.value)
        document.body.style.overflow = 'hidden'
        // cloned.value.addEventListener('touchmove', freezeVp, false)
        setTimeout(() => {
          cloned.value.style.opacity = 1
        }, 0)
      } else {
        cloned.value.style.opacity = 0
        // cloned.value.removeEventListener('touchmove', freezeVp, false)
        setTimeout(() => {
          closeButtonRef.value.removeEventListener('click', closeImage)
          cloned.value.remove()
          cloned.value = null
          closeButtonRef.value = null
          document.body.style.overflow = 'auto'
        }, 250)
      }
    })
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
  .expandable-image.expanded {
    position: fixed;
    z-index: 99999;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgb(0 0 0 / 90%);
    display: flex;
    align-items: center;
    opacity: 0;
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
