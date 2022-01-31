<template>
  <b-container class="submit-queue">
    <div>
      <h3 class="queue-title">{{ $t('pages.queue.submit_title') }}</h3>
      <p v-if="supportsReddit || supportsTwitter" class="queue-text">
        {{ $t('pages.queue.submit_text') }}
      </p>
      <p v-else class="queue-text">
        Once you submit your new BikeTag Post, a BikeTag Ambassador will approve the next round and
        then your new post will be live!
      </p>
    </div>
    <div>
      <b-tabs
        v-if="supportsReddit || supportsTwitter"
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
        <input type="hidden" name="form-name" value="submit-queued-tag" />
        <input type="hidden" name="playerId" :value="getPlayerId" />
        <fieldset v-if="supportsReddit">
          <label for="postToReddit">{{ $t('pages.queue.post_to_reddit') }}</label>
          <input v-model="postToReddit" name="postToReddit" type="checkbox" />
        </fieldset>
        <fieldset v-if="supportsTwitter">
          <label for="postToTwitter">{{ $t('pages.queue.post_to_twitter') }}</label>
          <input v-model="postToTwitter" name="postToTwitter" type="checkbox" />
        </fieldset>
        <b-button class="w-75 btn-post mt-2 mb-2 border-0" @click="onSubmit">
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
      postToReddit: false,
      postToTwitter: false,
    }
  },
  computed: {
    ...mapGetters([
      'getQueue',
      'getQueuedTag',
      'getCurrentBikeTag',
      'getPlayerId',
      'getGameName',
      'getGame',
    ]),
    supportsReddit() {
      return !!this.getGame.subreddit
    },
    supportsTwitter() {
      return false
    },
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
  methods: {
    onSubmit() {
      const formAction = this.$refs.submitTag.getAttribute('action')
      const formData = new FormData(this.$refs.submitTag)
      const submittedTag = this.getQueuedTag

      submittedTag.discussionUrl = JSON.stringify({
        postToReddit: this.postToReddit,
      })
      submittedTag.mentionUrl = JSON.stringify({
        postToTwitter: this.postToTwitter,
      })

      formData.append('discussionUrl', submittedTag.discussionUrl)
      formData.append('mentionUrl', submittedTag.mentionUrl)

      this.$emit('submit', {
        formAction,
        formData,
        tag: submittedTag,
        storeAction: 'submitQueuedTag',
      })
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
