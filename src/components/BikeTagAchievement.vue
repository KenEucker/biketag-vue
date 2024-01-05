<template>
  <div class="biketag-achievement">
    <div v-show="achievementPopupActive" class="popup">
      <div class="popup__body">
        <img :src="`/images/${achievement.key}.webp`" />
        <h1>{{ achievement.title }}</h1>
        <p>{{ achievement.description }}</p>
        <div class="popup__close" @click="closePopup">Close</div>
      </div>
    </div>
    <img class="biketag-achievement__icon" :src="achievementIconUrl" @click="openPopup" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  achievement: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['open', 'close'])
const achievementPopupActive = ref(false)
const achievementIconUrl = computed(() => `/images/${props.achievement.key}.webp`)

const openPopup = () => {
  achievementPopupActive.value = true
  emit('open')
}

const closePopup = () => {
  achievementPopupActive.value = false
  emit('close')
}
</script>

<style lang="scss" scoped>
.biketag-achievement {
  margin: auto auto 2.5rem 2rem;
  width: 100%;
  overflow-x: auto;

  img {
    height: 5rem;
    cursor: pointer;
  }
}

.popup {
  position: absolute;
  display: flex;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgb(0 0 0 / 60%);
  z-index: 1000;

  &__body {
    background-color: white;
    width: 30rem;
    height: fit-content;
    margin: auto;
    border-radius: 2rem;
    padding: 2rem;

    h1 {
      margin-top: 2rem;
    }

    img {
      height: 10rem;
    }
  }

  &__close {
    cursor: pointer;
    background-color: black;
    border-radius: 1rem;
    padding: 1rem;
    width: 9rem;
    color: white;
    margin: 2rem auto auto;
    font-size: 24px;
  }
}

@media (width <= 767px) {
  .biketag-achievement h3 {
    text-align: center;
  }
}
</style>
