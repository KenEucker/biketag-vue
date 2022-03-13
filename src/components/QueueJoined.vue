<template>
  <b-container class="queue-joined col-md-8 col-lg-8">
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
  </b-container>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTagButton from '@/components/BikeTagButton.vue'

export default defineComponent({
  name: 'QueueJoined',
  components: {
    BikeTagButton,
  },
  props: {
    tag: {
      type: Object,
      default: () => {
        return {}
      },
    },
  },
  data: function () {
    return {
      preview: null,
    }
  },
  computed: {
    ...mapGetters(['getQueue', 'getPlayerTag', 'getCurrentBikeTag']),
  },
  methods: {
    goViewRound() {
      this.$router.push('/round')
    },
    goMysteryQueue() {
      this.$store.dispatch('setFormStepToJoin', true)
    },
  },
})
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
      @media (min-width: 48rem) {
        width: 60%;
      }
      @media (min-width: 64rem) {
        width: 23rem;
      }
    }
  }
}
</style>
