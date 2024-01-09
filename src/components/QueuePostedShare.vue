<template>
  <div class="container queue-posted-share">
    <confetti-explosion v-if="showConfetti" />
    <h3 class="queue-title">{{ $t('pages.round.share_title') }}</h3>
    <p class="queue-text">{{ $t('pages.round.share_text') }}</p>

    <div>
      <s-facebook :share-options="shareOptions">
        <img src="@/assets/images/facebook.svg" class="img-fluid share-logo" />
      </s-facebook>
      <s-reddit :share-options="shareOptions">
        <img src="@/assets/images/Reddit.svg" class="img-fluid share-logo" />
      </s-reddit>
      <s-diaspora :share-options="shareOptions">
        <img src="@/assets/images/Diaspora.svg" class="img-fluid share-logo" />
      </s-diaspora>
      <s-live-journal :share-options="shareOptions">
        <img src="@/assets/images/livejournal.svg" class="img-fluid share-logo" />
      </s-live-journal>
    </div>
    <br />
    <div>
      <h4>By clicking on the buttons above, OR by clicking the buttons to copy the text below</h4>
    </div>
    <br />
    <div>
      <b-tabs nav-item-class="nav-item">
        <b-tab>
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
        <b-tab>
          <template #title>
            <img
              v-b-popover.click.blur.top="'Copied!'"
              src="@/assets/images/Diaspora.svg"
              class="tab-logo img-fluid"
              @click="copyTabContents(postText)"
            />
          </template>
          <div class="twitter-post">
            <Markdown :source="postText" linkify="true" />
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
    </div>

    <div class="mt-3 align-center">
      <bike-tag-button
        class="border-0"
        :text="`${$t('pages.round.round_button')} #${getCurrentBikeTag?.tagnumber}`"
        @click="goViewRound"
      />
    </div>
  </div>
</template>

<script setup name="QueueSubmit">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBikeTagStore } from '@/store/index'
import { Settings } from '@/common/types'

// components
import Markdown from 'vue3-markdown-it'
import BikeTagButton from '@/components/BikeTagButton.vue'
import { useI18n } from 'vue-i18n'
import ConfettiExplosion from 'vue-confetti-explosion'

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
const router = useRouter()
const { t } = useI18n()
const showConfetti = ref(false)
const shareText = computed(
  () => `I won round ${getCurrentBikeTag.value.tagnumber} of BikeTag ${getGameNameProper.value}!`,
)
const shareOptions = computed(() => ({
  url: `https://${getGameName.value}.biketag.org/${getCurrentBikeTag.value.tagnumber}`,
  quote: shareText.value,
  message: shareText.value,
  text: shareText.value,
  hashtag: `#${getGameName.value}BikeTag`,
}))
// computed
const getCurrentBikeTag = computed(() => store.getCurrentBikeTag)
const getPreviousBikeTag = computed(() => store.getPreviousBikeTag)
const getGameName = computed(() => store.getGameName)
const getGameNameProper = computed(() => store.getGameNameProper)
const getGame = computed(() => store.getGame)
const shareUrl = computed(
  () => `[${getGameName.value}.biketag.org](https://${getGameName.value}.biketag.org)`,
)
const redditPostText = computed(
  () => `
  [#${getCurrentBikeTag.value.tagnumber} tag by ${getCurrentBikeTag.value.mysteryPlayer}](https://${getGameName.value}.biketag.org/${getCurrentBikeTag.value.tagnumber})

  Credit goes to ${getPreviousBikeTag.value.foundPlayer} for finding BikeTag #${getPreviousBikeTag.value.tagnumber} that ${getPreviousBikeTag.value.mysteryPlayer} posted!

  See all BikeTags and more, for ${getGameNameProper.value}:

  [${getGameName.value}.biketag.org](https://${getGameName.value}.biketag.org) | [Leaderboard](https://${getGameName.value}.biketag.org/leaderboard) | [Rules](https://${getGameName.value}.biketag.org/howto)
      `,
)
const postText = computed(
  () => `
  I played ${getGameNameProper.value} BikeTag!

  This is BikeTag number ${getCurrentBikeTag.value.tagnumber} by ${getCurrentBikeTag.value.mysteryPlayer}.
  Find this mystery location and move the tag to your favorite spot. The latest tag, instructions, and a hint are at ${shareUrl.value}

  #${getGameNameProper.value}BikeTag #Bike${getGameNameProper.value}`,
)
const instgramPostText = computed(
  () => `
  [#${getCurrentBikeTag.value.tagnumber} tag by ${getCurrentBikeTag.value.foundPlayer}](https://${getGameName.value}biketag.org/${getCurrentBikeTag.value.tagnumber})

  Credit goes to ${getCurrentBikeTag.value.foundPlayer} for finding BikeTag [#${getCurrentBikeTag.value.tagnumber}](${getCurrentBikeTag.value.discussionUrl}) that ${getCurrentBikeTag.value.mysteryPlayer} posted!

  "[${getCurrentBikeTag.value.foundLocation}](https://${getGameName.value}biketag.org/${getCurrentBikeTag.value.tagnumber})"

  See all BikeTags and more, for ${getGameNameProper.value}:

  ${shareUrl} | [Leaderboard](https://${getGameName.value}.biketag.org/leaderboard) | [Rules](https://${getGameName.value}.biketag.org/howto)
      `,
)

// methods
// function copyTabContents(text) {
//   navigator.clipboard.writeText(text)
// }
function goViewRound() {
  router.push('/round')
}

// mounted
onMounted(() => {
  // postToReddit.value = showReddit.value = supportsReddit.value
  // postToTwitter.value = showTwitter.value = supportsTwitter.value
  // postToInstagram.value = showInstagram.value = supportsInstagram.value
  showConfetti.value = true

  setTimeout(() => {
    showConfetti.value = false
  }, 3000)
})
</script>

<style lang="scss">
.queue-posted-share {
  .queue-title {
    text-transform: uppercase;
  }

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
@import '../assets/styles/style';

.queue-posted-share {
  .tab-logo {
    max-width: 2em;
  }

  .share-logo {
    width: 2.5em;
    height: 2.5em;
    margin-right: 1em;
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
      font-size: $default-font-size;
      margin-right: 1em;
    }

    input[type='checkbox'] {
      width: 1rem;
      height: 1rem;
    }
  }
}
</style>
