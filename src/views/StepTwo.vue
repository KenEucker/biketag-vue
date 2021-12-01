<template>
  <h1>Step Two</h1>
  <div>
    <legend for="street">Your Street:</legend>
    <input id="street" v-model="registration.street" name="street" />
  </div>
  <div>
    <legend for="city">Your City:</legend>
    <input id="city" v-model="registration.city" name="city" />
  </div>
  <div>
    <legend for="state">Your State:</legend>
    <input id="state" v-model="registration.state" name="state" />
  </div>
  <button @click.prevent="prev()">Previous</button>
  <button @click.prevent="next()">Next</button>
</template>
<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'StepTwo',
})
</script>
