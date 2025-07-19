<template>
  <div class="container delete-bike-tag">
    <h3 class="delete-title">{{ $t('pages.delete.title') }}</h3>

    <p class="delete-text">
      Deleting this tag will remove {{ getCurrentBikeTag.foundPlayer }}'s submission for tag
      #{{ getCurrentBikeTag.tagnumber - 1 }} and the latest mystery location.
      The mystery location will go back to {{ previousTag.foundPlayer }}'s tag.
    </p>

    <div class="bike-tag-container">
      <bike-tag
        v-if="getCurrentBikeTag"
        :tag="getCurrentBikeTag"
        :reverse="true"
        size="l"
        :show-posted-date="true"
      />
    </div>

    <div class="delete-button">
      <form
        ref="deleteTag"
        name="delete-latest-biketag"
        action="delete-latest-biketag"
        method="POST"
        data-netlify="true"
        data-netlify-honeypot="bot-field"
        @submit.prevent="deleteTagFunction"
      >
        <input type="hidden" name="form-name" value="delete-latest-biketag" />
        <input type="hidden" name="ambassadorId" :value="getAmbassadorId" />
        <input type="hidden" name="tagnumber" :value="getCurrentBikeTag.tagnumber" />
        <bike-tag-button class="circle-button" variant="circle" type="submit" label="Delete">
          <img src="/images/red-circle-x.webp" alt="Delete Latest Tag" />
        </bike-tag-button>
        <span>DELETE</span>
      </form>
    </div>
  </div>
</template>

<script setup name="DeleteBikeTag">
import { useBikeTagStore } from '@/store/index'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

// components
import BikeTag from '@/components/BikeTag.vue'
import BikeTagButton from '@/components/BikeTagButton.vue'

// emit
const emit = defineEmits(['submit'])

// refs and store
const deleteTag = ref(null)
const store = useBikeTagStore()
const { t } = useI18n()
const getAmbassadorId = computed(() => store.getAmbassadorId)

// computed
const allTags = computed(() => store.getTags)
const getCurrentBikeTag = computed(() => store.getCurrentBikeTag)
const previousTag = computed(() => {
  const tags = allTags.value
  return tags.filter(t => t.tagnumber === getCurrentBikeTag.value.tagnumber - 1)
})

// methods
function deleteTagFunction() {
  const formAction = deleteTag.value.getAttribute('action')
  const formData = new FormData(deleteTag.value)

  emit('submit', {
    formAction,
    formData,
    tag: getCurrentBikeTag.value,
    storeAction: 'deleteCurrentTag',
  })
}
</script>

<style lang="scss" scoped>
@import '../assets/styles/style';

.delete-bike-tag {
  text-align: center;

  .delete-title {
    font-family: $default-font-family;
    text-transform: uppercase;
    margin-bottom: 1em;
  }

  .delete-text {
    font-family: $default-secondary-font-family;
    margin-bottom: 2em;
  }

  .bike-tag-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 2em;

    > * {
      flex: 1 1 300px;
      max-width: 500px;
    }
  }

  .delete-button {
    margin-top: 2em;

    form {
      display: flex;
      flex-direction: column;
      align-items: center;

      span {
        margin-top: 0.5em;
      }
    }

    .circle-button {
      max-width: 100px;

      img {
        max-width: 85px;
      }
    }
  }
}
</style>
