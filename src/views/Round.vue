<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="queue-page">
    <div v-if="props.usingTimer && isViewingQueue()" class="mt-2 clock-div">
      <i class="far fa-clock" />
      <span>{{ timer.minutes }}:{{ timer.seconds }}</span>
    </div>
    <div class="container round-page-description">
      <p v-if="getQueuedTags?.length">
        {{ t('pages.round.current_round_description') }}
        <br />
        <br />
        {{ t('pages.round.current_round_win_description') }}
      </p>
      <p v-else>
        {{ t('pages.round.current_round_description_empty') }}
      </p>
    </div>
    <span class="tag-number">
      #{{ getCurrentBikeTag?.tagnumber + (getFormStep > BiketagFormSteps.addFoundImage ? 1 : 0) }}
    </span>
    <div>
      <queue-view />
    </div>
  </div>
</template>

<script setup name="QueueBikeTagView">
import { ref, computed, onMounted } from 'vue'
import { useBikeTagStore } from '@/store/index'
import { BiketagFormSteps } from '@/common/types'
import { useTimer } from 'vue-timer-hook'
// import { sendNetlifyForm, sendNetlifyError } from '@/common/utils'

// components
import QueueView from '@/components/QueueView.vue'
import { useI18n } from 'vue-i18n'

// props
const props = defineProps({
  usingTimer: {
    type: Boolean,
    default: false,
  },
})

const time = new Date()
time.setSeconds(time.getSeconds() + 900) // 10 minutes timer
const timer = ref(useTimer(time.getSeconds()))
const uploadInProgress = ref(false)
const store = useBikeTagStore()
const { t } = useI18n()

const getFormStep = computed(() => store.getFormStep)
const getCurrentBikeTag = computed(() => store.getCurrentBikeTag)
const getQueuedTags = computed(() => store.getQueuedTags)

function isViewingQueue() {
  return getFormStep.value === BiketagFormSteps[BiketagFormSteps.viewRound]
}

// created
const created = async () => {
  await store.fetchCurrentBikeTag()
  await store.fetchQueuedTags()
}
created()

// mounted
onMounted(() => {
  uploadInProgress.value = false
})
</script>

<style lang="scss">
@import '../assets/styles/style';

#app {
  .queue-page {
    .card.polaroid .player-bicon .player-name {
      font-weight: 100;
      font-size: 3rem;
      transform: unset;
    }

    .queue-title {
      font-size: 2rem;
    }
  }
}
</style>
<style scoped lang="scss">
@import '../assets/styles/style';

.queue-page {
  .clock-div > i {
    color: forestgreen;
    cursor: pointer;
    font-size: 25px;
    margin-right: 10px;
  }

  .tag-number {
    left: 50%;
    transform: translateX(-50%);
    z-index: 99;
    padding: 0 1.5rem;
  }
}

.round-page-description {
  font-family: $default-font-family;
  text-transform: uppercase;
}

.realign-spinner {
  margin-left: -15%;

  @media (width >= 620px) {
    margin-left: 0;
  }
}
</style>
