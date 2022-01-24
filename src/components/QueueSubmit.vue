<template>
  <b-container class="submit-queue">
    <div>
      <p class="queue-title">{{ $t('pages.queue.submit_title') }}</p>
    </div>
    <div>
      <b-tabs
        :options="{ useUrlFragment: false }"
        nav-item-class="nav-item"
        @clicked="tabClicked"
        @changed="tabChanged"
      >
        <b-tab v-if="supportsReddit">
          <template #title>
            <img src="../assets/images/Reddit.svg" class="tab-logo img-fluid" />
          </template>
          <div class="reddit-post">
            <Markdown :source="redditPostText" linkify="true" />
          </div>
        </b-tab>
        <b-tab v-if="supportsTwitter">
          <template #title>
            <img src="../assets/images/Twitter.svg" class="tab-logo img-fluid" />
          </template>
          <div class="twitter-post">
            <Markdown :source="twitterPostText" linkify="true" />
          </div>
        </b-tab>
      </b-tabs>

      <form
        ref="submitTag"
        name="submit-queued-tag"
        action="submit-queued-tag"
        method="POST"
        data-netlify="true"
        data-netlify-honeypot="bot-field"
        @submit.prevent="onSubmit"
      >
        <fieldset v-if="supportsReddit">
          <label for="postToReddit">{{ $t('pages.queue.post_to_reddit') }}</label>
          <input v-model="postToReddit" name="postToReddit" type="checkbox" />
        </fieldset>
        <fieldset v-if="supportsTwitter">
          <label for="postToTwitter">{{ $t('pages.queue.post_to_twitter') }}</label>
          <input v-model="postToTwitter" name="postToTwitter" type="checkbox" />
        </fieldset>
        <b-button class="w-75 btn-post mt-2 mb-2 border-0" @click="submit">
          {{ $t('pages.queue.post_new_tag') }} &nbsp;
        </b-button>
      </form>
    </div>
  </b-container>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import Markdown from 'vue3-markdown-it'

export default defineComponent({
  name: 'QueueSubmit',
  components: {
    Markdown,
  },
  emits: ['submit'],
  data() {
    return {
      foundImagePreview: '',
      mysteryImagePreview: '',
      postToReddit: true,
      postToTwitter: true,
      supportsTwitter: true,
      supportsReddit: true,
    }
  },
  computed: {
    ...mapGetters(['getQueue', 'getQueuedTag', 'getCurrentBikeTag', 'getGameName']),
    // supportsReddit: function () {
    //   return this.redditPostText?.length > 0
    // },
    twitterPostText() {
      return `
  Seattle BikeTag!
  
  This is bike tag number ${this.getQueuedTag.tagnumber} by ${this.getQueuedTag.foundPlayer}.
  Find this mystery location and move the tag to your favorite spot. The latest tag, instructions, and a hint are at [seattle.biketag.org](https://seattle.biketag.org)
  
  #SeattleBikeTag #SeaBikes #BikeSeattle`
    },
    redditPostText() {
      return `
[#${this.getQueuedTag.tagnumber} tag by ${this.getQueuedTag.foundPlayer}](https://biketag.io/#/${this.getQueuedTag.tagnumber})

Credit goes to ${this.getQueuedTag.foundPlayer} for finding BikeTag [#${this.getCurrentBikeTag.tagnumber}](${this.getCurrentBikeTag.discussionUrl}) that ${this.getCurrentBikeTag.mysteryPlayer} posted!

"[${this.getQueuedTag.foundLocation}](https://biketag.io/#/${this.getCurrentBikeTag.tagnumber})"

See all BikeTags and more, for ${this.getGameName}:

[biketag.io](https://https://biketag.io) | [Leaderboard](https://https://biketag.io/leaderboard) | [Rules](https://https://biketag.io/#howto)
        `
    },
  },
  mounted() {
    this.setFoundImagePreview(this.getQueuedTag)
    this.setMysteryImagePreview(this.getQueuedTag)
  },
  methods: {
    onSubmit() {
      const formAction = this.$refs.mysteryTag.getAttribute('action')
      const formData = new FormData(this.$refs.mysteryTag)
      const submittedTag = {
        discussionUrl: JSON.stringify({
          postToReddit: true,
        }),
        mentionUrl: JSON.stringify({
          postToTwitter: false,
        }),
      }

      this.$emit('submit', {
        formAction,
        formData,
        tag: submittedTag,
        storeAction: 'submitQueuedTag',
      })
    },
    reset() {
      this.$store.dispatch('resetFormStepToFound')
    },
    setMysteryImagePreview(tag) {
      if (tag.mysteryImageUrl?.length) {
        this.mysteryImagePreview = tag.mysteryImageUrl
      } else if (tag.mysteryImage) {
        var reader = new FileReader()
        reader.onload = (e) => {
          this.mysteryImagePreview = e.target.result
        }
        reader.readAsDataURL(tag.mysteryImage)
      }
    },
    setFoundImagePreview(tag) {
      if (tag.foundImageUrl?.length) {
        this.foundImagePreview = tag.foundImageUrl
      } else if (tag.foundImage) {
        var reader = new FileReader()
        reader.onload = (e) => {
          this.foundImagePreview = e.target.result
        }
        reader.readAsDataURL(tag.foundImage)
      }
    },
  },
})
</script>
<style lang="scss">
.submit-queue {
  .nav-tabs {
    margin-bottom: -6px;

    .nav-link {
      border-right: none;
      border-left: none;
    }
  }
}
</style>
<style scoped lang="scss">
.submit-queue {
  .tab-logo {
    max-width: 2em;
  }
  .reddit-post {
    background-color: white;
    padding: 1em;
    text-align: left;
    margin-bottom: 1em;
  }
  .twitter-post {
    background-color: black;
    padding: 1em;
    text-align: left;
    margin-bottom: 1em;
    color: white;
    font-weight: 800;
  }
}
</style>
