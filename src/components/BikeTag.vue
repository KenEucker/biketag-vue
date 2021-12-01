<template>
  <b-row>
    <b-col v-show="foundImageUrl" md="6" class="mb-3">
      <b-card>
        <a :href="imageurl" target="_blank">
          <div class="img-wrapper">
            <span class="tag-number">#{{ tagnumber }}</span>
            <span class="tag-player">{{ player }}</span>
            <expandable-image
              class="image img-fluid"
              :src="foundImageUrl"
              alt="#{{ tagnumber }} tag (hint:  {{ hint }}  ) by {{ player }}"
            ></expandable-image>
          </div>
          <span class="desc">{{ foundDescription }}</span>
        </a>
      </b-card>
    </b-col>
    <b-col :md="foundImageUrl ? 6 : 12" class="mb-3">
      <b-card>
        <a :href="imageurl" target="_blank">
          <div class="img-wrapper">
            <span class="tag-number">#{{ tagnumber }}</span>
            <span class="tag-player">{{ player }}</span>
            <expandable-image
              class="image img-fluid"
              :src="mysteryImageUrl"
              alt="#{{ tagnumber }} tag (hint:  {{ hint }}  ) by {{ player }}"
            ></expandable-image>
          </div>
          <span class="desc">{{ mysteryDescription }}</span>
        </a>
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
    player: {
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
})
</script>
<style scoped>
.img-wrapper {
  position: relative;
}
.img-wrapper > .tag-number {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 99;
  font-size: 5vh;
  font-weight: 500;
  color: white;
  text-shadow: 2px 2px #292828e6;
  background-color: rgba(0, 0, 0, 0.75);
  padding: 0 0.5rem;
  /* border-radius: 10px; */
}
.img-wrapper > .tag-player {
  position: absolute;
  right: 1rem;
  bottom: 0;
  font-family: AshesAshes;
  font-size: 5vh;
  color: white;
  text-shadow: 2px 2px #292828e6;
  z-index: 99;
}
.desc {
  position: relative;
  font-size: 3vh;
}
</style>
