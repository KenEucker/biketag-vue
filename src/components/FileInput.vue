<template>
  <label for="currentTag"></label>
  <input type="file" name="currentTag" class="hidden" required="" />
  <div class="upload-box" data-message="(BikeTag @ {{ label }})">
    <img src="@/assets/images/blank-tag.png" />
    <span>(BikeTag @ {{ label }})</span>
  </div>
  <div class="m-imgur-post hidden">
    <span class="close"></span>
    <img src="@/assets/images/none.png" />
    <h2 class="description">
      <span class="s--proofNumber">#{{ tagnumber }}</span>
      found at (<span id="proofPreview"></span>) by <span id="namePreview"></span>
    </h2>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'FileInput',
  props: {
    label: {
      type: String,
      default: '',
    },
    tagnumber: {
      type: String,
      default: '',
    },
  },
})
</script>
<style scoped>
.upload-box {
  border-radius: 10px;
  margin: auto;
  margin-bottom: 2em;
  min-width: 15vw;
  min-height: 12vh;
  padding: 0.5em;
  cursor: pointer;
  width: 50%;
  position: relative;
  border-bottom: inset;
  border-top-width: thin;
  border: dashed;
  border-right-width: thin;
  border-left-width: thin;
}
#proofTag .upload-box {
  color: rgb(255, 109, 58);
}
#currentTag .upload-box {
  color: rgb(93, 236, 178);
}
.upload-box img {
  max-width: 18vh;
  margin-top: -5px;
}
.upload-box span {
  position: absolute;
  bottom: 1px;
  width: 100%;
  display: block;
  font-family: Lota;
  word-break: break-word;
  font-size: 0.7em;
}
.upload-box::after {
  content: 'upload your image of';
  display: block;
  margin-top: -20px;
}
.upload-box.s--uploaded::after {
  content: 'image uploaded';
}
img {
  width: 100%;
}
</style>
