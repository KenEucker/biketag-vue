<template>
  <div class="container queue-joined col-md-8 col-lg-8">
    <div class="mt-3">
      <bike-tag-button @click="goMysteryQueue">
        {{ $t('pages.round.mystery_button') }}
      </bike-tag-button>
    </div>
    <h3 class="queue-title">{{ $t('pages.round.joined_title') }}</h3>
    <p class="queue-text">{{ $t('pages.round.joined_text') }}</p>
    <div class="mt-3">
      <bike-tag-button variant="medium" @click="goViewRound">
        {{ $t('pages.round.joined_button') }} {{ getCurrentBikeTag?.tagnumber }}
      </bike-tag-button>
    </div>
  </div>
</template>

<script setup name="QueueJoined">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBikeTagStore } from '@/store/index'
import { useI18n } from 'vue-i18n'

// components
import BikeTagButton from '@/components/BikeTagButton.vue'

// props
const props = defineProps({
  tag: {
    type: Object,
    default: () => {
      return {}
    },
  },
})

// data
const store = useBikeTagStore()
const router = useRouter()
const { t } = useI18n()

// computed
const getCurrentBikeTag = computed(() => store.getCurrentBikeTag)

// methods
function goViewRound() {
  router.push('/round')
}
function goMysteryQueue() {
  store.setFormStepToJoin(true)
}
</script>

<style lang="scss">
.btn-mystery {
  background-color: blue;
}

.mt-3 {
  .biketag {
    &__button {
      &--light {
        min-height: 12rem;
        width: unset !important;
      }

      &--medium {
        min-height: 6rem;
      }

      width: 90%;

      @media (width >= 48rem) {
        width: 60%;
      }

      @media (width >= 64rem) {
        width: 23rem;
      }
    }
  }
}
</style>
