<template>
  <bike-header />
  <div>
    <div>
      <h2>NEED A HINT?</h2>
      <hr />
    </div>
    <div>
      <p>
        player <span id="userCredit" class="special">{{ getCurrentBikeTag.mysteryPlayer }}</span>
        provided a hint:
        <br />
        <span id="hintText" class="family">{{ getCurrentBikeTag.hint }}</span>
      </p>
    </div>
  </div>
  <bike-footer />
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'

export default defineComponent({
  name: 'HintPage',
  computed: {
    ...mapGetters(['getCurrentBikeTag']),
  },
})
</script>
<style scoped lang="scss"></style>
