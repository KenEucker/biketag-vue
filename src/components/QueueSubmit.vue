<template>
  <div class="container queue-submit">
    <div>
      <h3 class="queue-title">{{ $t('pages.round.submit_title') }}</h3>
    </div>
    <div>
      <b-tabs nav-item-class="nav-item">
        <b-tab v-if="!!getGame?.subreddit?.length">
          <template #title>
            <img
              v-b-popover.click.blur.top="'Copied!'"
              src="@/assets/images/Reddit.svg"
              class="tab-logo img-fluid"
              @click="copyTabContents(redditPostText)"
            />
          </template>
          <div class="reddit-post">
            <Markdown v-if="supportsReddit && showReddit" :source="redditPostText" linkify="true" />
            <pre v-if="!showReddit">{{ redditPostText }}</pre>
          </div>
        </b-tab>
        <b-tab v-if="!!getGame?.account?.length">
          <template #title>
            <img
              v-b-popover.click.blur.top="'Copied!'"
              src="@/assets/images/Twitter.svg"
              class="tab-logo img-fluid"
              @click="copyTabContents(twitterPostText)"
            />
          </template>
          <div v-if="supportsTwitter && showTwitter" class="twitter-post">
            <Markdown :source="twitterPostText" linkify="true" />
            <pre v-if="!showTwitter">{{ twitterPostText }}</pre>
          </div>
        </b-tab>
        <b-tab v-if="!!getGame?.page?.length">
          <template #title>
            <img
              v-b-popover.click.blur.top="'Copied!'"
              src="@/assets/images/Instagram.svg"
              class="tab-logo img-fluid"
              @click="copyTabContents(instagramPostText)"
            />
          </template>
          <div class="instagram-post">
            <Markdown
              v-if="supportsInstagram && showInstagram"
              :source="instagramPostText"
              linkify="true"
            />
            <pre v-if="!showInstagram">{{ instagramPostText }}</pre>
          </div>
        </b-tab>
      </b-tabs>
      <p v-if="supportsReddit || supportsTwitter || supportsInstagram" class="queue-text">
        {{ $t('pages.round.submit_text') }}
      </p>
      <p v-else class="queue-text">
        {{ $t('pages.round.submit_text_no_autopost') }}
        {{ $t('pages.round.submit_text_manual_social') }}
      </p>

      <form
        ref="submitTag"
        name="post-new-biketag"
        action="post-new-biketag"
        method="POST"
        data-netlify="true"
        data-netlify-honeypot="bot-field"
        @submit.prevent="onSubmit"
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
        <bike-tag-button
          variant="medium"
          :text="$t('pages.round.post_new_tag')"
          @click="onSubmit"
        />
      </form>
    </div>
  </div>
</template>

<script setup name="QueueSubmit">
import { ref, computed, onMounted } from 'vue'
import { useBikeTagStore } from '@/store/index'
import { Settings } from '@/common/types'

// components
import Markdown from 'vue3-markdown-it'
import BikeTagButton from '@/components/BikeTagButton.vue'
import { useI18n } from 'vue-i18n'

// data
const emit = defineEmits(['submit'])
const postToReddit = ref(false)
const postToTwitter = ref(false)
const postToInstagram = ref(false)
const showReddit = ref(false)
const showTwitter = ref(false)
const showInstagram = ref(false)
const submitTag = ref(null)
const store = useBikeTagStore()
const { t } = useI18n()

// computed
const getPlayerTag = computed(() => store.getPlayerTag)
const getCurrentBikeTag = computed(() => store.getCurrentBikeTag)
const getPlayerId = computed(() => store.getPlayerId)
const getGameNameProper = computed(() => store.getGameNameProper)
const getGame = computed(() => store.getGame)
const supportsReddit = computed(() => !!getGame.value?.settings[Settings.SupportsReddit])
const supportsTwitter = computed(() => !!getGame.value?.settings[Settings.SupportsTwitter])
const supportsInstagram = computed(() => !!getGame.value?.settings[Settings.SupportsInstagram])
const redditPostText = computed(
  () => `
[#${getPlayerTag.value.tagnumber} tag by ${getPlayerTag.value.foundPlayer}](https://biketag.org/${getPlayerTag.value.tagnumber})

Credit goes to ${getPlayerTag.value.foundPlayer} for finding BikeTag [#${getCurrentBikeTag.value.tagnumber}](${getCurrentBikeTag.value.discussionUrl}) that ${getCurrentBikeTag.value.mysteryPlayer} posted!

"[${getPlayerTag.value.foundLocation}](https://biketag.org/${getCurrentBikeTag.value.tagnumber})"

See all BikeTags and more, for ${getGameNameProper.value}:

[biketag.org](https://https://biketag.org) | [Leaderboard](https://https://biketag.org/leaderboard) | [Rules](https://https://biketag.org/howto)
    `,
)
const twitterPostText = computed(
  () => `
Seattle BikeTag!

This is bike tag number ${getPlayerTag.value.tagnumber} by ${getPlayerTag.value.foundPlayer}.
Find this mystery location and move the tag to your favorite spot. The latest tag, instructions, and a hint are at [seattle.biketag.org](https://seattle.biketag.org)

#SeattleBikeTag #SeaBikes #BikeSeattle`,
)

// methods
function copyTabContents(text) {
  navigator.clipboard.writeText(text)
}
function onSubmit() {
  const formAction = submitTag.value.getAttribute('action')
  const formData = new FormData(submitTag.value)
  const submittedTag = getPlayerTag.value

  submittedTag.discussionUrl = JSON.stringify({
    postToReddit: postToReddit.value,
  })
  submittedTag.mentionUrl = JSON.stringify({
    postToTwitter: postToTwitter.value,
  })
  submittedTag.shareUrl = JSON.stringify({
    postToInstagram: postToInstagram.value,
  })

  formData.append('discussionUrl', submittedTag.discussionUrl)
  formData.append('mentionUrl', submittedTag.mentionUrl)
  // formData.append('shareUrl', submittedTag.shareUrl)

  emit('submit', {
    formAction,
    formData,
    tag: submittedTag,
    storeAction: 'postNewBikeTag',
  })
}

// mounted
onMounted(() => {
  postToReddit.value = showReddit.value = supportsReddit.value
  postToTwitter.value = showTwitter.value = supportsTwitter.value
  postToInstagram.value = showInstagram.value = supportsInstagram.value
})
</script>

<style lang="scss">
.queue-submit {
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
.queue-submit {
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
