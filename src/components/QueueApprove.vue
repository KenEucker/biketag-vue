<template>
  <div></div>
  <div v-if="!getQueuedTags?.length" class="container queue-approve-tag">
    <h3 class="queue-title">{{ $t('pages.round.approve_title') }}</h3>
    <p class="queue-text">{{ $t('pages.round.empty_text') }}</p>
  </div>
  <div v-else class="container queue-approve-tag queue-approve">
    <h3 class="queue-title">{{ $t('pages.round.approve_title') }}</h3>
    <p class="queue-text">{{ $t('pages.round.approve_text') }}</p>
    <bike-tag-queue :pagination-ref="controlledSwiper" :show-number="true" />
    <swiper
      :modules="[Controller]"
      :pagination="{}"
      :effect="'coverflow'"
      :grab-cursor="true"
      :centered-slides="true"
      :slides-per-view="1"
      :coverflow-effect="{
        rotate: 50,
        stretch: 0,
        depth: 100,
        modifier: 1,
        slideShadows: true,
      }"
      :space-between="10"
      @swiper="setControlledSwiper"
    >
      <swiper-slide v-for="(tag, index) in getQueuedTags" :key="index">
        <bike-tag
          v-if="tag.mysteryImageUrl?.length && tag.foundImageUrl?.length"
          :key="tag.tagnumber"
          :reverse="true"
          :show-posted-date="true"
          :tag="tag"
          size="l"
          :found-tagnumber="tag.mysteryImageUrl ? tag.tagnumber - 1 : tag.tagnumber"
          :mystery-description="mysteryDescription(tag)"
        />
        <bike-tag
          v-else
          :key="tag.playerId"
          :reverse="true"
          :tag="tag"
          size="l"
          :show-posted-date="false"
          :sized-mystery-image="false"
          mystery-image-url="/images/no_image.png"
          mystery-description="Mystery image not yet uploaded"
          :found-tagnumber="tag.mysteryImageUrl ? tag.tagnumber - 1 : tag.tagnumber"
          :found-description="stringifyNumber(index + 1)"
        />
      </swiper-slide>
    </swiper>
    <div class="container">
      <div class="approve-button row just-center">
        <form
          v-if="currentIsReadyForApproval"
          ref="approveTag"
          name="approve-new-biketag"
          action="approve-new-biketag"
          method="POST"
          data-netlify="true"
          data-netlify-honeypot="bot-field"
          @submit.prevent="approveTag"
        >
          <input type="hidden" name="form-name" value="approve-new-biketag" />
          <input type="hidden" name="ambassadorId" value="" />
          <span>APPROVE</span>
          <bike-tag-button class="circle-button" variant="circle" type="submit" label="Approve">
            <img src="/images/green-circle-check.png" alt="Approve This Tag" />
          </bike-tag-button>
        </form>
        <form
          ref="dequeueTag"
          name="dequeue-queued-tag"
          action="dequeue-queued-tag"
          method="POST"
          data-netlify="true"
          data-netlify-honeypot="bot-field"
          @submit.prevent="dequeueTagConfirm"
        >
          <input type="hidden" name="form-name" value="dequeue-queued-tag" />
          <input type="hidden" name="ambassadorId" value="" />
          <bike-tag-button class="circle-button" variant="circle" type="submit" label="Remove">
            <img src="/images/red-circle-x.png" alt="Delete This Tag" />
          </bike-tag-button>
          <span>REMOVE</span>
        </form>
        <b-modal
          v-model="confirmRemove"
          class="confirm-modal"
          title="Confirm Removal of Queued Tag"
          @ok="dequeueTag"
        >
          <p>{{ $t('pages.approve.confirm_remove') }}</p>
        </b-modal>
      </div>
      <div class="row">
        <span class="player-agree"> * {{ $t('pages.round.approve_agree') }} </span>
        <img class="ambassador-icon" src="/images/biketag-ambassador.svg" alt="Ambassador Icon" />
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { mapGetters } from 'vuex'
import SwiperCore, { Controller, Pagination } from 'swiper'
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/css/bundle'
import { stringifyNumber } from '@/common/utils'
import BikeTag from '@/components/BikeTag.vue'
import BikeTagQueue from '@/components/BikeTagQueue.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'

SwiperCore.use([Pagination])

export default defineComponent({
  name: 'QueueApprove',
  components: {
    Swiper,
    SwiperSlide,
    BikeTag,
    BikeTagQueue,
    BikeTagButton,
  },
  emits: ['submit'],
  setup() {
    const controlledSwiper = ref(null)
    const setControlledSwiper = (swiper) => {
      controlledSwiper.value = swiper
    }

    return {
      Controller,
      controlledSwiper,
      setControlledSwiper,
    }
  },
  data() {
    return {
      confirmRemove: false,
    }
  },
  computed: {
    ...mapGetters([
      'getQueuedTags',
      'getPlayerTag',
      'getCurrentBikeTag',
      'isBikeTagAmbassador',
      'getAmbassadorId',
    ]),
    currentIsReadyForApproval() {
      return this.currentlySelectedTag?.mysteryImageUrl && this.currentlySelectedTag?.foundImageUrl
    },
    currentlySelectedTag() {
      return this.getQueuedTags[this.controlledSwiper?.activeIndex]
    },
  },
  async mounted() {
    if (!this.isBikeTagAmbassador) {
      /// kick it sideways
      for (let x = 0; x < 1000; ++x) {
        const uhuhuh = () => console.log("YOU DIDN'T SAY THE MAGIC WORD!")
        await setTimeout(uhuhuh, 1)
      }
      this.$router.push('/')
    }
  },
  methods: {
    dequeueTagConfirm() {
      this.confirmRemove = true
    },
    dequeueTagConfirmYes() {
      this.confirmRemove = false
    },
    dequeueTagConfirmNo() {
      this.confirmRemove = false
    },
    dequeueTag() {
      const formAction = this.$refs.dequeueTag.getAttribute('action')
      const formData = new FormData(this.$refs.dequeueTag)

      this.$emit('submit', {
        formAction,
        formData,
        tag: this.currentlySelectedTag,
        storeAction: 'dequeueTag',
      })
    },
    approveTag() {
      const formAction = this.$refs.approveTag.getAttribute('action')
      const formData = new FormData(this.$refs.approveTag)
      const approvedTag = this.currentlySelectedTag

      this.$emit('submit', {
        formAction,
        formData,
        tag: approvedTag,
        storeAction: 'approveTag',
      })
    },
    mysteryDescription(tag) {
      return `"${tag?.hint}"`
    },
    mysteryPlayer() {
      return 'ken'
    },
    selectedTagPlayer() {
      return 1
    },
    stringifyNumber,
  },
})
</script>
<style lang="scss">
@import '../assets/styles/style';

.queue-approve {
  .card .tag-number {
    display: none;
  }

  .swiper-pagination {
    display: none;
  }

  .circle-button {
    max-width: 100px;

    img {
      max-width: 85px;
    }
  }
}
</style>
<style lang="scss" scoped>
@import '../assets/styles/style';

i {
  color: #000;
  font-size: 20px;
}

.ambassador-icon {
  max-height: 10vh;
}

form {
  flex-basis: fit-content;
  display: flex;
}

.player-agree {
  max-width: 50%;
  margin: auto;
}

.approve-button {
  font-family: $default-font-family;
  vertical-align: middle;

  span {
    margin: auto;
    padding-left: 1em;
    padding-right: 1em;
  }
}
</style>
