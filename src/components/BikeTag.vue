<template>
  <b-row>
    <b-col :md="foundImageUrl ? 6 : 12" class="mb-3">
      <b-card>
        <b-button v-show="hintBtn" class="btn-hint" variant="primary" @click="goHintPage"
          >?</b-button
        >
        <div class="img-wrapper">
          <span class="tag-number">#{{ tagnumber }}</span>
          <span class="tag-player">{{ mysteryPlayer }}</span>
          <expandable-image :src="mysteryImageUrl" alt="mysteryDescription"></expandable-image>
        </div>
        <span class="desc">{{ mysteryDescription }}</span>
      </b-card>
    </b-col>
    <b-col v-show="foundImageUrl" md="6" class="mb-3">
      <b-card>
        <div class="img-wrapper">
          <span class="tag-number">#{{ tagnumber }}</span>
          <span class="tag-player">{{ foundPlayer }}</span>
          <expandable-image
            class="image img-fluid"
            :src="foundImageUrl"
            alt="foundDescription"
          ></expandable-image>
        </div>
        <span class="desc">{{ foundDescription }}</span>
      </b-card>
    </b-col>
  </b-row>
</template>
<script>
import { defineComponent } from 'vue'
import ExpandableImage from '@/components/ExpandableImage.vue'

export default defineComponent({
  name: 'BikeTag',
  components: {
    ExpandableImage,
  },
  props: {
    hintBtn: {
      type: Boolean,
      default: false,
    },
    tagnumber: {
      type: String,
      default: '',
    },
    foundImageUrl: {
      type: String,
      default: '',
    },
    mysteryImageUrl: {
      type: String,
      default: '',
    },
    foundPlayer: {
      type: String,
      default: '',
    },
    mysteryPlayer: {
      type: String,
      default: '',
    },
    foundDescription: {
      type: String,
      default: '',
    },
    mysteryDescription: {
      type: String,
      default: '',
    },
  },
  mounted() {
    const viewportMeta = document.createElement('meta')
    viewportMeta.name = 'viewport'
    viewportMeta.content = 'width=device-width, initial-scale=1'
    document.head.appendChild(viewportMeta)
  },
  methods: {
    goHintPage: function () {
      this.$router.push('/hint')
    },
  },
})
</script>
<style scoped lang="scss">
.card-body > .btn-hint {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 99;
  border-radius: 5rem;
}
.img-wrapper {
  position: relative;
  .tag-number {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 99;
    padding: 0 0.5rem;
    text-shadow: 2px 2px #292828e6;
    /* border-radius: 10px; */
  }
  .tag-player {
    position: absolute;
    right: 1rem;
    bottom: 0;
    z-index: 99;
    text-shadow: 2px 2px #292828e6;
  }
  .desc {
    position: relative;
    font-size: 3vh;
  }
}
</style>
