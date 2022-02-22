<template>
  <b-container class="queue-found-tag col-md-8 col-lg-8">
    <h3 class="queue-title">{{ $t('pages.queue.found_title') }}</h3>
    <div>
      <img v-if="preview" :src="preview" class="img-fluid" />
      <img
        v-else
        class="img-fluid click-me"
        src="@/assets/images/blank.png"
        @click="$refs.file.click()"
      />
    </div>
    <form
      ref="foundTag"
      name="queue-found-tag"
      action="queue-found-tag"
      method="POST"
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      @submit.prevent="onSubmit"
    >
      <input type="hidden" name="form-name" value="queue-found-tag" />
      <input type="hidden" name="playerId" :value="getPlayerId" />
      <input v-model="foundImageUrl" type="hidden" name="foundImageUrl" />
      <div class="p-3">
        <label for="file-upload" class="btn-upload custom-file-upload">
          <i class="fa fa-camera" />
        </label>
        <input
          id="file-upload"
          ref="file"
          type="file"
          class="d-none"
          accept="image/*"
          required
          @change="setImage"
        />
      </div>
      <p class="queue-text">{{ $t('pages.queue.found_text') }}</p>
      <div class="mt-3 mb-3">
        <bike-tag-input
          id="found"
          v-model="location"
          name="found"
          required
          :placeholder="$t('pages.queue.location_placeholder')"
        />
        <bike-tag-input
          id="player"
          v-model="player"
          name="player"
          required
          :placeholder="$t('pages.queue.name_placeholder')"
        />
      </div>
      <bike-tag-button
        variant="medium"
        type="submit"
        :text="`${$t('pages.queue.queue_found_tag')} ${$t('pages.queue.queue_postfix')}`"
      />
    </form>
  </b-container>
</template>
<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTagButton from '@/components/BikeTagButton.vue'
import BikeTagInput from '@/components/BikeTagInput.vue'

export default defineComponent({
  name: 'QueueFoundTag',
  components: {
    BikeTagButton,
    BikeTagInput,
  },
  props: {
    tag: {
      type: Object,
      default: () => {
        return {}
      },
    },
  },
  emits: ['submit'],
  data: function () {
    return {
      preview: null,
      image: this.tag?.foundImage ?? '',
      location: this.tag?.foundLocation ?? '',
      player: this.tag?.foundPlayer ?? '',
      foundImageUrl: null,
      tagNumber: 0,
    }
  },
  computed: {
    ...mapGetters(['getGameName', 'getQueue', 'getQueuedTag', 'getPlayerId', 'getCurrentBikeTag']),
  },
  methods: {
    onSubmit(e) {
      e.preventDefault()
      const formAction = this.$refs.foundTag.getAttribute('action')
      const formData = new FormData(this.$refs.foundTag)
      const foundTag = {
        foundImage: this.image,
        foundPlayer: this.player,
        foundLocation: this.location,
        tagnumber: this.getCurrentBikeTag?.tagnumber ?? 0,
        game: this.getGameName,
      }

      this.$emit('submit', {
        formAction,
        formData,
        tag: foundTag,
        storeAction: 'queueFoundTag',
      })
    },
    setImage(event) {
      var input = event.target
      if (input.files) {
        this.image = input.files[0]
        const previewReader = new FileReader()
        previewReader.onload = (e) => {
          this.preview = e.target.result
        }
        previewReader.readAsDataURL(this.image)
      }
    },
  },
})
</script>
<style lang="scss">
.queue-found-tag {
  .biketag-button {
    width: 100%;
  }
}
</style>
<style scoped lang="scss">
.queue-found-tag {
  .custom-file-upload {
    border-radius: 2rem;
    display: inline-block;
    padding: 6px 12px;
    cursor: pointer;
  }

  .click-me {
    cursor: pointer;
    width: 90%;
  }

  // background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMzkwJyBoZWlnaHQ9JzM1MCcgdmlld0JveD0nMCAwIDM5MCAzNTAnIGZpbGw9J25vbmUnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc+CjxwYXRoIGQ9J00tMy4wNTIxMiAzMDYuMTc4Qy0zLjA1MjEyIDI4My4yOCAtNS4wODQ3NiAyMjkuNTk2IC04LjE3NTY1IDIwNy4wMUMtMTIuMjgwNSAxNzcuMDE0IC04LjE3NTYxIDE0NC44MDEgLTguMTc1NjEgMTE0LjYxQy04LjE3NTYxIDk2LjIwOTYgLTYuNTg1NjEgODUuMDUyOSAtNi41ODU2MSA2Ni44NTJDLTYuNTg1NjEgNTMuOTYyOSAtOC4xNzU2NCAyMS45NzA0IC04LjE3NTY0IDguNjc0ODJDLTguMTc1NjQgMy4yMTQ4MiAtMS44MTU0IDE2LjM5NDEgLTEuODE1NCAxMC45MzQxQy0xLjgxNTQgNS42MjkwNCAxLjM2NDc0IDIxLjYwOTggMS4zNjQ3NCAxNC41NjUyQzEuMzY0NzQgMTIuNzg5NiAxLjY1NTMgMTAuNzEyNyAxLjM1NjY4IDguODQyNTNDMS4xMjAxNyA4Ljc5MDQ2IDAuODg3MjA4IDguNzM0NjIgMC42NTgwNDEgOC42NzQ4MkMtMC4wNjgzMzU1IDguNDg1MjUgLTEuNTkxMTggMy4wMjUyNyAwLjU2ODMzNCA2LjU3NDYzQzAuNzgzMzQzIDYuNTcwNDMgMS41OTg4MiA2LjU2MDQ0IDIuOTY0NjMgNi41NDUxM0MxMC4yNzE2IDYuNDQxOTIgMzMuNjc4NCA2LjA5NTE0IDY1LjYyMjYgNS42MjE3NkM2OS40IDUuMTMxMzQgNzMuMTgzMiA0LjYwOTI3IDc2Ljk4MTQgNC4wNzU1MUMxMDIuNTQ0IDAuNDgzMjg2IDEzMC4wOTMgMi45NDU4NSAxNTUuOTU1IDIuOTQ1ODVIMjA2LjQ4NEMyMTAuNTc5IDIuOTQ1ODUgMjEzLjE2MSAwLjc2NzAyOCAyMTcuNjE0IDIuMjE5NjVDMjE4Ljg1MiAyLjYyMzU2IDIxOS45OTIgMy4wMDMxNiAyMjEuMTEyIDMuMzI4NzlDMzA5LjM3NiAyLjAzOTA2IDM5MC41MzYgMC44ODQyNDQgMzkwLjU3OSAxLjAwOTNDMzkyLjAyMiA0LjQ0NjkyIDM5Mi45MSAxOC4yNjM5IDM5My40MjEgMzcuNzc0M0MzOTUuMTYyIDEwNC4yNSAzOTIuNTIyIDIzNi44MTkgMzkyLjUyMiAyNTAuMTMzVjI5MC41MjRDMzkyLjUyMiAyOTcuMDQ5IDM5MC45MzIgMzAyLjg1OSAzOTAuOTMyIDMwOS40MDVDMzkwLjkzMiAzMTMuNTY2IDM5Mi44MTMgMzIwLjc4OSAzODguNDU4IDMxOS42NTNDMzg0LjEzNCAzMTguNTI0IDM3OS40NzkgMzIyLjg3MiAzNzUuNzM4IDMyMy44NDlDMzY5LjY2MiAzMjUuNDM0IDM2OC41OTQgMzE5LjU3MiAzNjMuMTA2IDMxOS41NzJIMzQ4QzM0MS45OTggMzE5LjU3MiAzMzYuMzQxIDMyMy42MzMgMzMwLjUwOSAzMjMuOTI5QzMyNi4wOTQgMzI0LjE1MyAzMTguNjU3IDMyNi4zMiAzMTQuNjA5IDMyNy45NjRDMzExLjYzNSAzMjkuMTcxIDMwMi44NjQgMzI1LjM4MiAyOTguNzA4IDMyNS4zODJDMjk0LjMzNCAzMjUuMzgyIDI5MS42MjYgMzIyLjQ3NyAyODYuNzgyIDMyMi40NzdDMjgxLjg0IDMyMi40NzcgMjc2LjY0NSAzMjEuMDI0IDI3Mi40NzIgMzIxLjAyNEMyNjAuNjI2IDMyMS4wMjQgMjUwLjk1NCAzMjUuMzgyIDIzOS4wOCAzMjUuMzgyQzIzMi41NiAzMjUuMzgyIDIxNS4wMzYgMzIxLjkyNyAyMDkuNjY0IDMyNi44MzRDMjA0LjQ1IDMzMS41OTYgMjAyLjExOCAzMjcuOTQzIDE5NS4zNTMgMzI4LjI4NkMxOTIuNzA0IDMyOC40MjEgMTg4LjU2NyAzMzYuNTg0IDE4Ni4xNjYgMzM4Ljc3NkMxODMuMzIxIDM0MS4zNzUgMTc2LjE5NiAzNDEuMjI4IDE3Mi4yOTcgMzQyLjgxMUMxNjcuMTUgMzQ0LjkgMTYxLjU0NyAzNDQuNTI2IDE1Ni40ODUgMzQ3LjE2OEMxNTIuODk5IDM0OS4wNCAxNDYuNTIgMzQ5LjQ0IDE0Mi4wODYgMzQ4LjU0QzE0MC4zNzMgMzQ4LjE5MiAxMzAuOTA1IDM0NC4zODcgMTMwLjE2IDM0My41MzdDMTI3LjUyOCAzNDAuNTMxIDExNi40NzggMzQyLjQyNyAxMTIuNjcgMzQxLjAzNUMxMDYuNTU4IDMzOC44MDMgOTYuMzcyIDM0MC4zMzggOTIuMzUyMSAzMzQuMDk2Qzg1Ljc1NDEgMzIzLjg1MSA3MS4yOTIgMzI4LjM1MSA2MC45MDQgMzIzLjYwNkM1MS43NDcyIDMxOS40MjQgNDEuNDM0MSAzMTkuNTcyIDMwLjc4MSAzMTkuNTcyQzI2LjcyNzIgMzE5LjU3MiAxLjM2NDc0IDMxOC40MDUgMS4zNjQ3NCAzMTUuOTQxQzEuMzY0NzQgMzExLjI5NSAtMy4wNTIxMiAzMDYuMTc4IC0zLjA1MjEyIDMwNi4xNzhaJyBmaWxsPScjQzRDNEM0Jy8+CjxwYXRoIGQ9J00wLjU2OTcwNSA2LjU3Njg4QzEuOTYwMzMgOC44NjMzMSAxLjM2NDc0IDEyLjAyMzEgMS4zNjQ3NCAxNC41NjUyQzEuMzY0NzQgMjEuNjA5OCAtMS44MTU0IDUuNjI5MDQgLTEuODE1NCAxMC45MzQxQy0xLjgxNTQgMTYuMzk0MSAtOC4xNzU2NCAzLjIxNDgyIC04LjE3NTY0IDguNjc0ODJDLTguMTc1NjQgMjEuOTcwNCAtNi41ODU2MSA1My45NjI5IC02LjU4NTYxIDY2Ljg1MkMtNi41ODU2MSA4NS4wNTI5IC04LjE3NTYxIDk2LjIwOTYgLTguMTc1NjEgMTE0LjYxQy04LjE3NTYxIDE0NC44MDEgLTEyLjI4MDUgMTc3LjAxNCAtOC4xNzU2NSAyMDcuMDFDLTUuMDg0NzYgMjI5LjU5NiAtMy4wNTIxMiAyODMuMjggLTMuMDUyMTIgMzA2LjE3OEMtMy4wNTIxMiAzMDYuMTc4IDEuMzY0NzQgMzExLjI5NSAxLjM2NDc0IDMxNS45NDFDMS4zNjQ3NCAzMTguNDA1IDI2LjcyNzIgMzE5LjU3MiAzMC43ODEgMzE5LjU3MkM0MS40MzQxIDMxOS41NzIgNTEuNzQ3MiAzMTkuNDI0IDYwLjkwNCAzMjMuNjA2QzcxLjI5MiAzMjguMzUxIDg1Ljc1NDEgMzIzLjg1MSA5Mi4zNTIxIDMzNC4wOTZDOTYuMzcyMSAzNDAuMzM4IDEwNi41NTggMzM4LjgwMyAxMTIuNjcgMzQxLjAzNUMxMTYuNDc4IDM0Mi40MjcgMTI3LjUyOCAzNDAuNTMxIDEzMC4xNiAzNDMuNTM3QzEzMC45MDUgMzQ0LjM4NyAxNDAuMzczIDM0OC4xOTIgMTQyLjA4NiAzNDguNTRDMTQ2LjUyIDM0OS40NCAxNTIuODk5IDM0OS4wNCAxNTYuNDg1IDM0Ny4xNjhDMTYxLjU0NyAzNDQuNTI2IDE2Ny4xNSAzNDQuOSAxNzIuMjk3IDM0Mi44MTFDMTc2LjE5NiAzNDEuMjI4IDE4My4zMjEgMzQxLjM3NSAxODYuMTY2IDMzOC43NzZDMTg4LjU2NyAzMzYuNTg0IDE5Mi43MDQgMzI4LjQyMSAxOTUuMzUzIDMyOC4yODZDMjAyLjExOCAzMjcuOTQzIDIwNC40NSAzMzEuNTk2IDIwOS42NjQgMzI2LjgzNEMyMTUuMDM2IDMyMS45MjcgMjMyLjU2IDMyNS4zODIgMjM5LjA4IDMyNS4zODJDMjUwLjk1NCAzMjUuMzgyIDI2MC42MjYgMzIxLjAyNCAyNzIuNDcyIDMyMS4wMjRDMjc2LjY0NSAzMjEuMDI0IDI4MS44NCAzMjIuNDc3IDI4Ni43ODIgMzIyLjQ3N0MyOTEuNjI2IDMyMi40NzcgMjk0LjMzNCAzMjUuMzgyIDI5OC43MDggMzI1LjM4MkMzMDIuODY0IDMyNS4zODIgMzExLjYzNSAzMjkuMTcxIDMxNC42MDkgMzI3Ljk2NEMzMTguNjU3IDMyNi4zMiAzMjYuMDk0IDMyNC4xNTMgMzMwLjUwOSAzMjMuOTI5QzMzNi4zNDEgMzIzLjYzMyAzNDEuOTk4IDMxOS41NzIgMzQ4IDMxOS41NzJDMzUzLjAzNSAzMTkuNTcyIDM1OC4wNyAzMTkuNTcyIDM2My4xMDYgMzE5LjU3MkMzNjguNTk0IDMxOS41NzIgMzY5LjY2MiAzMjUuNDM0IDM3NS43MzggMzIzLjg0OUMzNzkuNDc5IDMyMi44NzIgMzg0LjEzNCAzMTguNTI0IDM4OC40NTggMzE5LjY1M0MzOTIuODEzIDMyMC43ODkgMzkwLjkzMiAzMTMuNTY2IDM5MC45MzIgMzA5LjQwNUMzOTAuOTMyIDMwMi44NTkgMzkyLjUyMiAyOTcuMDQ5IDM5Mi41MjIgMjkwLjUyNEMzOTIuNTIyIDI3OS4wNjEgMzkyLjUyMiAyNjEuMzY2IDM5Mi41MjIgMjUwLjEzM0MzOTIuNTIyIDIzMi45MTEgMzk2LjkzOSAxNi4xNTk1IDM5MC41NzkgMS4wMDkzTTAuNTY5NzA1IDYuNTc2ODhDLTEuNTkxODMgMy4wMjI5NiAtMC4wNjg0ODk1IDguNDg1MjEgMC42NTgwNDEgOC42NzQ4MkM3LjQwNDkgMTAuNDM1NiAxNy40NDAxIDguNzU1NTEgMjQuNDIwOCA4Ljc1NTUxQzQyLjIyNjcgOC43NTU1MSA1OS40NDM3IDYuNTQwMDQgNzYuOTgxNCA0LjA3NTUxQzEwMi41NDQgMC40ODMyODYgMTMwLjA5MyAyLjk0NTg1IDE1NS45NTUgMi45NDU4NUMxNzIuNzk4IDIuOTQ1ODUgMTg5LjY0MSAyLjk0NTg1IDIwNi40ODQgMi45NDU4NUMyMTAuNTc5IDIuOTQ1ODUgMjEzLjE2MSAwLjc2NzAyOCAyMTcuNjE0IDIuMjE5NjVDMjIxLjI4IDMuNDE1NSAyMjQuMDg2IDQuMzk4MjcgMjI4LjAzOCA0LjM5ODI3QzI1MS41NjUgNC4zOTgyNyAyNzUuMDkyIDQuMzk4MjcgMjk4LjYxOSA0LjM5ODI3QzMxOS4yNzUgNC4zOTgyNyAzMzkuOTM0IDIuOTQ1ODUgMzYwLjM2NyAyLjk0NTg1QzM2NS43ODUgMi45NDU4NSAtNC44NDgzMSA2LjU3Njg4IDAuNTY5NzA1IDYuNTc2ODhaTTAuNTY5NzA1IDYuNTc2ODhDMi44NzMwNiA2LjU3Njg4IDM5MC40ODYgMC43MzU5NjUgMzkwLjU3OSAxLjAwOTNNMzkwLjU3OSAxLjAwOTNDMzk1LjgwNCAxNi41MjA5IDM5OS4xIDMwNC4wMTkgMzk3LjIwOCAzMTkuNTcyJyBzdHJva2U9J2JsYWNrJyBzdHJva2Utd2lkdGg9JzInIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcvPgo8L3N2Zz4K');
}
</style>
