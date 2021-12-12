<template>
  <b-container class="col-8 col-lg-6">
    <span>New Mystery Location</span>
    <div>
      <img v-if="preview" :src="preview" class="img-fluid" />
      <img v-if="!preview" class="img-fluid" src="@/assets/images/blank.png" />
    </div>
    <div class="p-3">
      <!-- <b-button>Photos</b-button> -->
      <label for="file-upload" class="btn-upload custom-file-upload">
        <i class="fa fa-camera" />
      </label>
      <input id="file-upload" type="file" class="d-none" accept="image/*" @change="setImage" />
      <!-- <b-button>Switch</b-button> -->
    </div>
    <div class="mt-3">
      <b-form-input id="input-name" v-model="player" placeholder="Enter your name" />
    </div>
    <div>
      <b-form-input id="input-hint" v-model="hint" placeholder="Enter your hint" />
    </div>
    <div class="mt-3">
      <b-button class="w-100 btn-mystery border-0" @click="queueMysteryTag">
        Submit New Tag &nbsp; <i class="fas fa-check-square" />
      </b-button>
      <span>
        Uploading to BideTag. Org requires that you agree to the terms and conditions set by the
        BikeTag Project
      </span>
    </div>
  </b-container>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'

export default defineComponent({
  name: 'QueueMysteryTag',
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
      image: this.tag?.mysteryImage,
      hint: this.tag?.hint ?? '',
      player: this.tag?.mysteryPlayer ?? this.tag?.foundPlayer ?? '',
    }
  },
  computed: {
    ...mapGetters(['getQueuedTag']),
  },
  methods: {
    queueMysteryTag() {
      this.$store.dispatch('setQueueMystery', {
        mysteryImage: this.image,
        mysteryPlayer: this.player,
        hint: this.hint,
      })
      this.goNextStep()
    },
    goNextStep() {
      this.$store.dispatch('incFormStep')
    },
    setImage(event) {
      var input = event.target
      if (input.files) {
        var reader = new FileReader()
        reader.onload = (e) => {
          this.preview = e.target.result
        }
        this.image = input.files[0]
        reader.readAsDataURL(input.files[0])
      }
    },
  },
})
</script>
<style scoped lang="scss">
.custom-file-upload {
  border-radius: 2rem;
  display: inline-block;
  padding: 6px 12px;
  cursor: pointer;
}
</style>