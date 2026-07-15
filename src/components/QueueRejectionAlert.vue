<template>
  <div v-if="getPlayerRejectedUpload" class="queue-rejection-alert">
    <img
      class="queue-rejection-alert__image"
      :src="getPlayerRejectedUpload.imageUrl"
      alt="Rejected BikeTag image"
    />
    <p class="queue-rejection-alert__message">
      {{ rejectionMessage }}
    </p>
  </div>
</template>

<script setup name="QueueRejectionAlert">
import { formatPlayerRejectionMessage } from '@/common'
import { useBikeTagStore } from '@/store/index'
import { computed } from 'vue'

const store = useBikeTagStore()
const getPlayerRejectedUpload = computed(() => store.getPlayerRejectedUpload)
const rejectionMessage = computed(() => {
  const rejected = getPlayerRejectedUpload.value
  if (!rejected) return ''
  return formatPlayerRejectionMessage(rejected.type, rejected.reason)
})
</script>

<style lang="scss" scoped>
@import '../assets/styles/style';

.queue-rejection-alert {
  margin: 1rem auto 2rem;
  max-width: 640px;
  padding: 1rem;
  border: 2px solid #c0392b;
  border-radius: 8px;
  background: rgb(255 255 255 / 90%);

  &__image {
    display: block;
    width: 100%;
    max-height: 320px;
    object-fit: contain;
    margin-bottom: 1rem;
  }

  &__message {
    margin: 0;
    font-family: $default-font-family;
    line-height: 1.5;
  }
}
</style>
