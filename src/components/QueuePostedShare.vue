<template>
  <div class="container queue-posted-share">
    <h3 class="queue-title">{{ $t('pages.round.posted_title') }}</h3>
    <p class="queue-text">{{ $t('pages.round.posted_text') }}</p>
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
        <div class="mt-3 align-center">
          <bike-tag-button
            variant="medium"
            class="mt-2 mb-2 border-0"
            :text="$t('pages.round.post_new_tag')"
            @click="onSubmit"
          />
        </div>
      </form>
    </div>

    <div class="mt-3 align-center">
      <bike-tag-button
        class="border-0"
        :text="`${$t('pages.round.joined_button')} #${getCurrentBikeTag?.tagnumber}`"
        @click="goViewRound"
      />
    </div>
  </div>
</template>

<script setup name="QueueSubmit">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/store/index.ts'
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
const store = useStore()
const router = useRouter()
const { t } = useI18n()

// computed
const getPlayerTag = computed(() => store.getPlayerTag)
const getCurrentBikeTag = computed(() => store.getCurrentBikeTag)
const getPlayerId = computed(() => store.getPlayerId)
const getGameName = computed(() => store.getGameName)
const getGame = computed(() => store.getGame)
const supportsReddit = computed(() => !!getGame.value?.settings[Settings.SupportsReddit])
const supportsTwitter = computed(() => !!getGame.value?.settings[Settings.SupportsTwitter])
const supportsInstagram = computed(() => !!getGame.value?.settings[Settings.SupportsInstagram])
const redditPostText = computed(
  () => `
[#${getPlayerTag.value.tagnumber} tag by ${getPlayerTag.value.foundPlayer}](https://${getGameName.value}.biketag.org/#/${getPlayerTag.value.tagnumber})

Credit goes to ${getPlayerTag.value.foundPlayer} for finding BikeTag [#${getCurrentBikeTag.value.tagnumber}](${getCurrentBikeTag.value.discussionUrl}) that ${getCurrentBikeTag.value.mysteryPlayer} posted!

"[${getPlayerTag.value.foundLocation}](https://${getGameName.value}.biketag.org/#/${getCurrentBikeTag.value.tagnumber})"

See all BikeTags and more, for ${getGameName.value}:

[${getGameName.value}.biketag.org](https://${getGameName.value}.biketag.org) | [Leaderboard](https://${getGameName.value}.biketag.org/leaderboard) | [Rules](https://${getGameName.value}.biketag.org/#howto)
    `,
)
const twitterPostText = computed(
  () => `
Seattle BikeTag!

This is bike tag number ${getPlayerTag.value.tagnumber} by ${getPlayerTag.value.foundPlayer}.
Find this mystery location and move the tag to your favorite spot. The latest tag, instructions, and a hint are at [seattle.biketag.org](https://seattle.biketag.org)

#SeattleBikeTag #SeaBikes #BikeSeattle`,
)
// const instgramPostText = computed(
//   () => `
// [#${getPlayerTag.value.tagnumber} tag by ${getPlayerTag.value.foundPlayer}](https://${getGameName.value}biketag.org/#/${getPlayerTag.value.tagnumber})

// Credit goes to ${getPlayerTag.value.foundPlayer} for finding BikeTag [#${getCurrentBikeTag.value.tagnumber}](${getCurrentBikeTag.value.discussionUrl}) that ${getCurrentBikeTag.value.mysteryPlayer} posted!

// "[${getPlayerTag.value.foundLocation}](https://${getGameName.value}biketag.org/#/${getCurrentBikeTag.value.tagnumber})"

// See all BikeTags and more, for ${getGameName.value}:

// [${getGameName.value}.biketag.org](https://${getGameName.value}.biketag.org) | [Leaderboard](https://${getGameName.value}.biketag.org/leaderboard) | [Rules](https://${getGameName.value}.biketag.org/#howto)
//     `
// )

// methods
function copyTabContents(text) {
  navigator.clipboard.writeText(text)
}
function goViewRound() {
  router.push('/round')
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
.queue-posted-share {
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
.queue-posted-share {
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

  form {
    label {
      font-size: 1.5rem;
      margin-right: 1em;
    }

    input[type='checkbox'] {
      width: 1rem;
      height: 1rem;
    }
  }
}
</style>
