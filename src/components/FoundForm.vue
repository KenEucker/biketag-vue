<template>
  <b-container>
    <span>Queue Found Location</span>
    <div><img class="img-fluid" src="@/assets/images/blank.png" /></div>
    <div class="p-3">
      <!-- <b-button>Photos</b-button> -->
      <label for="file-upload" class="custom-file-upload text-white">
        <i class="fa fa-camera" />
      </label>
      <input id="file-upload" type="file" class="d-none" />
      <!-- <b-button>Switch</b-button> -->
    </div>
    <div>
      <b-form-input id="input-found" placeholder="Enter found location" />
    </div>
    <div class="mt-3">
      <b-form-input id="input-name" placeholder="Enter your name" />
    </div>
    <div class="mt-3">
      <b-button class="w-100 submit-btn bg-info border-0" @click="goNextStep">
        Queue Found Tag &nbsp; <i class="fas fa-check-square" />
      </b-button>
    </div>
  </b-container>
</template>
<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'FoundForm',
  methods: {
    goNextStep() {
      this.$store.dispatch('incFormStep')
    },
  },
})
</script>
<style scoped></style>
