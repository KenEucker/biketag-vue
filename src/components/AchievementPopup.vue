<template>
  <div class="popup-bg">
    <div class="popup-body">
      <img :src="`/images/${data.image}.webp`" />
      <h1>{{ data.title }}</h1>
      <p>{{ data.description }}</p>
      <div class="close-popup" @click="$emit('close')">Close</div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
})
</script>

<style>
.popup-bg {
  position: absolute;
  display: flex;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
}
.popup-body {
  background-color: white;
  width: 30rem;
  height: fit-content;
  margin: auto;
  border-radius: 2rem;
  padding: 2rem;
}
h1 {
  margin-top: 2rem;
}
.close-popup {
  cursor: pointer;
  background-color: black;
  border-radius: 1rem;
  padding: 1rem;
  width: 9rem;
  color: white;
  margin: 2rem auto auto;
  font-size: 24px;
}
</style>
