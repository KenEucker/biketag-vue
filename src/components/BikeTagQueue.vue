<template>
  <div v-if="onlyMine">
    <b-button id="current-mystery-popover" class="navigation">
      <img class="img-fluid" :src="getImgurImageSized(getCurrentBikeTag.mysteryImageUrl, 's')" />
    </b-button>
    <b-popover
      target="current-mystery-popover"
      triggers="click blur hover focus"
      placement="bottom"
    >
      <b-button id="popover-view-image" variant="primary">View</b-button>
      <b-popover target="popover-view-image" triggers="click blur hover focus" placement="top">
        <template #title>Current Mystery Location</template>
        <img class="img-fluid" :src="getCurrentBikeTag.mysteryImageUrl" />
      </b-popover>
      <b-button variant="danger" class="ms-2" @click="reset">Reset</b-button>
    </b-popover>

    <b-button id="queued-found-popover" class="navigation">
      <img class="img-fluid" :src="getImgurImageSized(getQueuedTag.mysteryImageUrl, 's')" />
    </b-button>
    <b-popover target="queued-found-popover" triggers="click blur hover focus" placement="bottom">
      <b-button id="popover-view-image" variant="primary">View</b-button>
      <b-popover target="popover-view-image" triggers="click blur hover focus" placement="top">
        <template #title>Queued Found Image</template>
        <img class="img-fluid" :src="getQueuedTag.mysteryImageUrl" />
      </b-popover>
      <b-button variant="danger" class="ms-2" @click="resetToQueued">Reset</b-button>
    </b-popover>

    <b-button id="queued-mystery-popover" class="navigation">
      <img class="img-fluid" :src="getImgurImageSized(getQueuedTag.mysteryImageUrl, 's')" />
    </b-button>
    <b-popover target="queued-mystery-popover" triggers="click blur hover focus" placement="bottom">
      <b-button id="popover-view-image" variant="primary">View</b-button>
      <b-popover target="popover-view-image" triggers="click blur hover focus" placement="top">
        <template #title>Queued Mystery Image</template>
        <img class="img-fluid" :src="getQueuedTag.mysteryImageUrl" />
      </b-popover>
      <b-button variant="danger" class="ms-2" @click="resetToSubmitted">Reset</b-button>
    </b-popover>

    <!-- <b-button v-if="getQueuedTag.foundImageUrl" class="navigation" @click="resetToQueued">
      <img class="img-fluid" :src="getImgurImageSized(getQueuedTag.foundImageUrl, 't')" />
    </b-button>

    <b-button v-if="getQueuedTag.mysteryImageUrl" class="navigation" @click="resetToSubmitted">
      <img class="img-fluid" :src="getImgurImageSized(getQueuedTag.mysteryImageUrl, 't')" />
    </b-button> -->
  </div>
  <div v-if="!onlyMine" class="bike-pagination">
    <img
      v-for="(tag, index) in getQueuedTags"
      :key="index"
      class="bike-pagination-bullet"
      :src="tag.foundImageUrl"
    />
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'

export default defineComponent({
  name: 'BikeTagQueue',
  props: {
    onlyMine: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    ...mapGetters(['getQueuedTags', 'getCurrentBikeTag', 'getQueuedTag', 'getImgurImageSized']),
  },
  methods: {
    reset() {
      this.$store.dispatch('setQueuedTag', {})
      this.$store.dispatch('resetFormStep')
    },
    resetToQueued() {
      this.$store.dispatch('setQueuedTag', {})
    },
    resetToSubmitted() {
      this.$store.dispatch('setQueuedTag', {})
    },
  },
})
</script>
<style lang="scss" scoped>
.navigation {
  width: 40px;
  height: 40px;
  margin: 10px;
  padding: 0;
  cursor: pointer;
  border: 0;
  border-radius: 5rem;
  img {
    width: 40px;
    height: 40px;
    border-radius: 5rem;
  }
}
.bike-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  /* border: 1px solid red; */
  color: #000;

  i {
    margin-right: 20px;
    font-size: 25px;
  }
}
.bike-pagination-bullet {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  margin: 5px;
  border-radius: 5rem;
  cursor: pointer;
}
</style>
