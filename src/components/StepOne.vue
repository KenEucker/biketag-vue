<template>
  <b-container>
    <div><img src="@/assets/images/Roundback.png" /></div>
    <div class="p-3">
      <!-- <b-button>Photos</b-button> -->
      <label for="file-upload" class="custom-file-upload text-white">
        <i class="fa fa-camera" />
      </label>
      <input id="file-upload" type="file" class="d-none" />
      <!-- <b-button>Switch</b-button> -->
    </div>
    <div>
      <b-form-input id="input-name" placeholder="Enter your name" />
      <span>you are number 2 in the queue, submit a completed tag now to "win the round!"</span>
    </div>
    <div class="mt-3">
      <b-button variant="primary" class="w-100 submit-btn" @click="goReddit">
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
  name: 'StepOne',
})
</script>
<style scoped>
.custom-file-upload {
  background-color: orangered;
  border-radius: 2rem;
  display: inline-block;
  padding: 6px 12px;
  cursor: pointer;
}
</style>
