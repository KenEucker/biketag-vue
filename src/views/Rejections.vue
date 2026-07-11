<template>
  <loading
    v-show="actionInProgress"
    v-model:active="actionInProgress"
    :is-full-page="true"
    class="realign-spinner"
  >
    <img class="spinner" src="@/assets/images/SpinningBikeV1.svg" alt="Loading..." />
  </loading>
  <div class="queue-page">
    <queue-rejections
      v-if="!actionInProgress"
      @action-error="onActionError"
      @action-success="onActionSuccess"
    />
  </div>
</template>

<script setup name="RejectionsView">
import QueueRejections from '@/components/QueueRejections.vue'
import { useBikeTagStore } from '@/store/index'
import { inject, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Loading from 'vue-loading-overlay'

const actionInProgress = ref(false)
const store = useBikeTagStore()
const toast = inject('toast')
const { t } = useI18n()

async function onActionSuccess(action) {
  toast.open({
    message: `${action} ${t('notifications.success')}`,
    type: 'success',
    position: 'top',
  })
}

function onActionError(message) {
  toast.open({
    message: `${t('notifications.error')}: ${message}`,
    type: 'error',
    duration: 10000,
    timeout: false,
    position: 'bottom',
  })
}

onMounted(async () => {
  await store.isReady()
  actionInProgress.value = false
})
</script>
