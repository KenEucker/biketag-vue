<template>
  <div class="container">
    <form id="biketagUploadForm">
      <div id="heading" class="field half">
        <bike-tag
          :tagnumber="getLastTag.tagnumber"
          :mystery-image-url="getLastTag.mysteryImageUrl"
          :player="getLastTag.player"
          mystery-description="CURRENT MYSTERY LOCATION TO FIND"
        />
      </div>
      <hr />
      <div id="proofTag" class="field half first">
        <h3>Play a BikeTag that matches the Biketag in round #{{ tagnumber }}</h3>
        <file-input :tagnumber="getLastTag.tagnumber" label="matching Mystery location" />
      </div>
      <div id="location" class="field half first">
        <label for="location" class="form-label">
          Describe where the Mystery Location was found
        </label>
        <input
          id="location"
          class="form-control"
          type="text"
          name="location"
          placeholder="e.g. Cathedral Park, NE 42nd and Shaver, etc."
          required=""
        />
      </div>
      <div id="currentTag" class="field half">
        <h3>
          Play a new BikeTag at a new Mystery Location to begin round #
          {{ getLastTag.tagnumber + 1 }}
        </h3>
        <!-- <label for="currentTag"></label>
          <input type="file" name="currentTag" class="hidden" required="" />
          <div class="upload-box" data-message="(BikeTag @ new Mystery Location)">
            <img src="@/assets/images/blank-tag.png" />
            <span>(BikeTag @ new Mystery Location)</span>
          </div>
          <div class="m-imgur-post hidden">
            <span class="close"></span>
            <img src="@/assets/images/none.png" />
            <h2 class="description">
              <span class="s--tagNumber">#{{ getLastTag.tagnumber + 1 }}</span>
              tag (<span id="hintPreview"></span>) by <span id="namePreview"></span>
            </h2>
          </div> -->
        <file-input :tagnumber="getLastTag.tagnumber" label="new Mystery location" />
      </div>
      <div id="hint" class="field half">
        <label for="hint" class="form-label">Provide a hint for the new Mystery Location</label>
        <input
          id="hint"
          class="form-control"
          type="text"
          name="hint"
          placeholder="e.g. puns, riddles, rhymes, nearby landmarks, where historical events occurred"
        />
      </div>
      <div id="name" class="field">
        <h3>What do you go by?</h3>
        <label for="name" class="form-label">Provide a Name, Username, Alias</label>
        <input
          id="name"
          class="form-control"
          type="text"
          name="name"
          placeholder="e.g. Your Reddit (u/) or Instagram handle (@), nickname, team name, real name"
          required=""
        />
      </div>
      <b-button id="submit" variant="primary" class="m-10">Play BikeTag!</b-button>
    </form>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTag from '@/components/BikeTag.vue'
import FileInput from '@/components/FileInput.vue'

export default defineComponent({
  name: 'HomePage',
  components: {
    BikeTag,
    FileInput,
  },
  computed: {
    ...mapGetters(['getLastTag']),
  },
  methods: {
    goArchivePage: function () {
      this.$router.push('/archive')
    },
    goHowPage: function () {
      this.$router.push('/how')
    },
    goAboutPage: function () {
      this.$router.push('/about')
    },
    goHintPage: function () {
      this.$router.push('/hint')
    },
    goDonatePage: function () {
      this.$router.push('/donate')
    },
  },
})
</script>
<style scoped>
#biketagUploadForm > div {
  padding-bottom: 15px;
}
#proofTag h3 {
  color: rgb(255, 109, 58);
}
#currentTag h3 {
  color: rgb(93, 236, 178);
}
</style>
