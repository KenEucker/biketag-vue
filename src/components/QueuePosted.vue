<script setup name="QueuePosted">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useBikeTagStore } from '@/store/index'
import { debug } from '@/common/utils'

// components
import BikeTagButton from '@/components/BikeTagButton.vue'
import { useI18n } from 'vue-i18n'

// data
const emit = defineEmits(['submit'])
const submitTagRef = ref(null)
const store = useBikeTagStore()
const router = useRouter()
const { t } = useI18n()
const postToReddit = ref(false)
const postToTwitter = ref(false)
const postToInstagram = ref(false)

// computed
const getCurrentBikeTag = computed(() => store.getCurrentBikeTag)
const getPlayerTag = computed(() => store.getPlayerTag)
const getPlayerId = computed(() => store.getPlayerId)

// methods
function goViewRound() {
  router.push('/round')
}
async function submitTag(defaultShareSettings) {
  await store.fetchCredentials()
  const formAction = submitTagRef.value.getAttribute('action')
  const formData = new FormData(submitTagRef.value)
  const submittedTag = getPlayerTag.value
  defaultShareSettings = defaultShareSettings ?? {
    postToReddit,
    postToTwitter,
    postToInstagram,
  }

  submittedTag.discussionUrl = '☯'
  submittedTag.mentionUrl = JSON.stringify({
    postToTwitter: defaultShareSettings.postToTwitter.value,
  })
  submittedTag.shareUrl = JSON.stringify({
    postToInstagram: defaultShareSettings.postToInstagram.value,
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
  /// TODO: check the mysteryTime instead of the discussion URL once (biketag-api)#207 is resolved.
  if (!getPlayerTag.value?.discussionUrl?.length) {
    /// TODO: check game settings for queue and remove this hardcoded hack
    const defaultShareSettings = {
      postToReddit: postToReddit.value,
      postToTwitter: postToTwitter.value,
      postToInstagram: postToInstagram.value,
    }
    debug('autosubmitting tag with default share settings', defaultShareSettings)
    nextTick(() => submitTag(defaultShareSettings), 1000)
  }
})
</script>

<template>
  <div class="container queue-posted">
    <h3 class="queue-title">{{ $t('pages.round.posted_title') }}</h3>
    <p class="queue-text">{{ $t('pages.round.posted_text') }}</p>
    <div class="mt-3">
      <bike-tag-button variant="medium" @click="goViewRound">
        {{ $t('pages.round.joined_button') }} #{{ getCurrentBikeTag?.tagnumber }}
      </bike-tag-button>
    </div>
    <form
      ref="submitTagRef"
      name="post-new-biketag"
      action="post-new-biketag"
      method="POST"
      data-netlify="true"
      data-netlify-honeypot="bot-field"
    >
      <input type="hidden" name="form-name" value="post-new-biketag" />
      <input type="hidden" name="playerId" :value="getPlayerId" />
      <!-- <fieldset v-if="supportsReddit">
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
      </fieldset> -->
      <!-- <div class="mt-3 align-center">
        <bike-tag-button
          variant="medium"
          class="mt-2 mb-2 border-0"
          :text="$t('pages.round.post_new_tag')"
          @click="onSubmit"
        />
      </div> -->
    </form>
  </div>
</template>
