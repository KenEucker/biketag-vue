<template>
  <b-container>
    <span>New Mystery Location</span>
    <div><img class="img-fluid" src="@/assets/images/blank.png" /></div>
    <div class="p-3">
      <!-- <b-button>Photos</b-button> -->
      <label for="file-upload" class="btn-upload custom-file-upload">
        <i class="fa fa-camera" />
      </label>
      <input id="file-upload" type="file" class="d-none" />
      <!-- <b-button>Switch</b-button> -->
    </div>
    <div>
      <b-form-input id="input-hint" placeholder="Enter your hint" />
    </div>
    <div class="mt-3">
      <b-button class="w-100 btn-mystery border-0" @click="goNextStep">
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

export default defineComponent({
  name: 'MysteryForm',
  methods: {
    goNextStep() {
      this.$store.dispatch('incFormStep')
    },
  },
})
</script>
<style scoped>
.custom-file-upload {
  border-radius: 2rem;
  display: inline-block;
  padding: 6px 12px;
  cursor: pointer;
}
</style>
