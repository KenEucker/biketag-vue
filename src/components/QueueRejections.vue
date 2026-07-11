<template>
  <div v-if="!getRejectedImages?.length" class="container queue-rejections">
    <h3 class="queue-title">Rejected BikeTag Images</h3>
    <p class="queue-text">There are no rejected BikeTag images for the current round.</p>
  </div>
  <div v-else class="container queue-rejections">
    <h3 class="queue-title">Rejected BikeTag Images</h3>
    <p class="queue-text">Review automated rejections for the current round.</p>
    <div v-for="item in getRejectedImages" :key="item.key" class="queue-rejections__item">
      <img class="queue-rejections__image" :src="item.url" :alt="`${item.type} rejected image`" />
      <p class="queue-rejections__reason">{{ item.reason }}</p>
      <p class="queue-rejections__meta">
        <strong>Type:</strong> {{ item.type }}<br />
        <strong>Player ID:</strong> {{ item.playerId || 'unknown' }}<br />
        <strong>Player IP:</strong> {{ item.playerIp || 'unknown' }}
      </p>
      <div class="queue-rejections__actions">
        <bike-tag-button variant="medium" text="Approve" @click="confirmApprove(item)" />
        <bike-tag-button variant="medium-orange" text="Delete" @click="confirmDelete(item)" />
      </div>
    </div>
    <b-modal v-model="confirmApproveOpen" title="Approve Rejected Image" @ok="approveSelected">
      <p>Approve this rejected image and restore it to the queue?</p>
    </b-modal>
    <b-modal v-model="confirmDeleteOpen" title="Delete Rejected Image" @ok="deleteSelected">
      <p>Delete this rejected image permanently?</p>
    </b-modal>
  </div>
</template>

<script setup name="QueueRejections">
import { useBikeTagStore } from '@/store/index'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BikeTagButton from '@/components/BikeTagButton.vue'

const emit = defineEmits(['action-error', 'action-success'])
const store = useBikeTagStore()
const router = useRouter()
const confirmApproveOpen = ref(false)
const confirmDeleteOpen = ref(false)
const selectedItem = ref(null)

const getRejectedImages = computed(() => store.getRejectedImages)
const isBikeTagAmbassador = computed(() => store.isBikeTagAmbassador)

function confirmApprove(item) {
  selectedItem.value = item
  confirmApproveOpen.value = true
}

function confirmDelete(item) {
  selectedItem.value = item
  confirmDeleteOpen.value = true
}

async function approveSelected() {
  if (!selectedItem.value?.url) return
  const result = await store.approveRejectedImage(selectedItem.value.url)
  if (result === true) {
    emit('action-success', 'approve')
  } else {
    emit('action-error', result)
  }
}

async function deleteSelected() {
  if (!selectedItem.value?.url) return
  const result = await store.deleteRejectedImage(selectedItem.value.url)
  if (result === true) {
    emit('action-success', 'delete')
  } else {
    emit('action-error', result)
  }
}

onMounted(async () => {
  if (!isBikeTagAmbassador.value) {
    router.push('/')
    return
  }
  await store.fetchRejectedImages(false)
})
</script>

<style lang="scss" scoped>
@import '../assets/styles/style';

.queue-rejections {
  &__item {
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid rgb(0 0 0 / 10%);
  }

  &__image {
    display: block;
    width: 100%;
    max-height: 420px;
    object-fit: contain;
    margin-bottom: 1rem;
  }

  &__reason,
  &__meta {
    font-family: $default-font-family;
    line-height: 1.5;
  }

  &__actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }
}
</style>
