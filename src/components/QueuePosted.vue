<template>
  <b-container class="queue-posted">
    <h3 class="queue-title">{{ $t('pages.round.posted_title') }}</h3>
    <p class="queue-text">{{ $t('pages.round.posted_text') }}</p>
    <div class="mt-3">
      <bike-tag-button variant="medium" @click="goViewRound">
        {{ $t('pages.round.joined_button') }} #{{ getCurrentBikeTag?.tagnumber }}
      </bike-tag-button>
    </div>
    <form
      ref="submitTag"
      name="post-new-biketag"
      action="post-new-biketag"
      method="POST"
      data-netlify="true"
      data-netlify-honeypot="bot-field"
    >
      <input type="hidden" name="form-name" value="post-new-biketag" />
      <input type="hidden" name="playerId" :value="getPlayerId" />
      <fieldset v-if="supportsReddit">
        <label for="postToReddit">{{ $t('pages.round.post_to_reddit') }}</label>
        <input
          v-model="postToReddit"
          name="postToReddit"
          type="checkbox"
          @click="showReddit = !showReddit"
        />
      </fieldset>
      <fieldset v-if="supportsTwitter">
        <label for="postToTwitter">{{ $t('pages.round.post_to_twitter') }}</label>
        <input
          v-model="postToTwitter"
          name="postToTwitter"
          type="checkbox"
          @click="showTwitter = !showTwitter"
        />
      </fieldset>
      <fieldset v-if="supportsInstagram">
        <label for="postToInstagram">{{ $t('pages.round.post_to_instagram') }}</label>
        <input
          v-model="postToInstagram"
          name="postToInstagram"
          type="checkbox"
          @click="showInstagram = !showInstagram"
        />
      </fieldset>
      <!-- <div class="mt-3 align-center">
        <bike-tag-button
          variant="medium"
          class="mt-2 mb-2 border-0"
          :text="$t('pages.round.post_new_tag')"
          @click="onSubmit"
        />
      </div> -->
    </form>
  </b-container>
</template>
<script>
import { computed, onMounted } from 'vue'
import { useStore } from '@/store/index.ts'
import BikeTagButton from '@/components/BikeTagButton.vue'
import { debug } from '@/common/utils'

export default {
  name: 'QueuePosted',
  components: {
    BikeTagButton,
  },
  emits: ['submit'],
  setup() {
    const store = useStore()

    // computed
    const getCurrentBikeTag = computed(() => store.getCurrentBikeTag)
    const getPlayerTag = computed(() => store.getPlayerTag)

    // methods
    function goViewRound() {
      this.$router.push('/round')
    }
    function submitTag(defaultShareSettings) {
      const formAction = this.$refs.submitTag.getAttribute('action')
      const formData = new FormData(this.$refs.submitTag)
      const submittedTag = getPlayerTag.value
      defaultShareSettings = defaultShareSettings ?? {
        postToReddit: this.postToReddit,
        postToTwitter: this.postToTwitter,
        postToInstagram: this.postToInstagram,
      }

      submittedTag.discussionUrl = JSON.stringify({
        postToReddit: defaultShareSettings.postToReddit,
      })
      submittedTag.mentionUrl = JSON.stringify({
        postToTwitter: defaultShareSettings.postToTwitter,
      })
      submittedTag.shareUrl = JSON.stringify({
        postToInstagram: defaultShareSettings.postToInstagram,
      })

      formData.append('discussionUrl', submittedTag.discussionUrl)
      formData.append('mentionUrl', submittedTag.mentionUrl)
      // formData.append('shareUrl', submittedTag.shareUrl)

      this.$emit('submit', {
        formAction,
        formData,
        tag: submittedTag,
        storeAction: 'postNewBikeTag',
      })
    }

    // mounted
    onMounted(() => {
      if (!getPlayerTag.value?.discussionUrl?.length) {
        /// TODO: check game settings for queue and remove this hardcoded hack
        const defaultShareSettings = {
          postToReddit: this.postToReddit,
          postToTwitter: this.postToTwitter,
          postToInstagram: this.postToInstagram,
        }
        debug('autosubmitting tag with default share settings', defaultShareSettings)
        submitTag(defaultShareSettings)
      }
    })

    return {
      getCurrentBikeTag,
      goViewRound,
      submitTag,
    }
  },
}
</script>
