<template>
  <div>
    <div ref="root" :class="[props.variant, 'button-group']">
      <div v-if="props.variant === 'current'">
        <!-- Left Button -->
        <bike-tag-button class="button-group__left" :text="t('menu.map')" @click="goMapPage" />
        <!-- Middle Button -->
        <bike-tag-button
          id="hint"
          ref="hintButton"
          class="button-group__middle"
          :text="t('menu.hint')"
          variant="bold"
        />
        <b-popover ref="hintPopover" hide-header target="hint" triggers="click" placement="top">
          <img :src="hintIcon" class="popover__hint-icon" alt="Hint" />
          <p class="popover__hint-text">{{ getCurrentHint }}</p>
          <img :src="closeRounded" class="popover__close" alt="close" @click="closePopover" />
        </b-popover>
        <!-- Right Button -->
        <bike-tag-button
          v-if="getQueuedTags?.length"
          class="button-group__right"
          :text="t('menu.queue')"
          @click="goRoundPage"
        />
        <bike-tag-button
          v-else
          class="button-group__right"
          :text="t('menu.last')"
          @click="emit('previous')"
        />
      </div>
      <div v-if="props.variant === 'single'">
        <!-- Left Button -->
        <bike-tag-button
          class="button-group__left"
          :text="t('menu.previous')"
          @click="emit('previous')"
        />
        <!-- Middle Button -->
        <bike-tag-button
          class="tag-screen-download__button"
          variant="bold"
          :text="t('menu.download')"
          @click="downloadTag"
        />
        <!-- <b-modal
          v-model="showCamera"
          class="camera-modal"
          title="BikeTag Camera"
          hide-footer
          hide-header
        >
          <bike-tag-camera :tag="props.tag" />
        </b-modal> -->
        <!-- Right Button -->
        <bike-tag-button class="button-group__right" :text="t('menu.next')" @click="emit('next')" />
      </div>
    </div>
    <!-- World -->
    <div class="button-reset-container">
      <bike-tag-button class="button-reset" variant="circle" @click="goWorldwide">
        <img class="footer-image" src="@/assets/images/npworld.webp" alt="BikeTag World Wide" />
      </bike-tag-button>
    </div>
    <div class="mt-5 mb-5 foss-container">
      <div class="row">
        <a href="https://github.com/KenEucker/biketag-vue">
          <img src="@/assets/images/github-logo.svg" alt="GitHub" />
        </a>
        <a href="https://www.netlify.com/">
          <img src="@/assets/images/netlify-logo-dark.svg" alt="Netlify" />
        </a>
      </div>
      <div class="mt-2 row">
        <i>
          BikeTag is an entirely free and open-source project that is on GitHub for open
          collaboration and graciously hosted by Netlify on their free open-source plan.
        </i>
      </div>
    </div>
  </div>
</template>

<script setup name="BikeTagFooter">
import { ref, computed, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useBikeTagStore } from '@/store/index'
import HintIcon from '@/assets/images/hint-icon.svg'
import CloseRounded from '@/assets/images/close-rounded.svg'
import { useI18n } from 'vue-i18n'
import { exportHtmlToDownload } from '@/common/utils'

// componets
import BikeTagButton from '@/components/BikeTagButton.vue'
// import BikeTagCamera from '@/components/BikeTagCamera.vue'

// props
const props = defineProps({
  variant: {
    type: String,
    default: 'current',
  },
  tag: {
    type: Object,
    default: () => ({}),
  },
})

// data
const emit = defineEmits(['next', 'previous'])
const root = ref(null)
// const showCamera = ref(false)
const hintIcon = HintIcon
const closeRounded = CloseRounded
const hintPopover = ref(null)
const hintButton = ref(null)
const store = useBikeTagStore()
const router = useRouter()
const { t } = useI18n()
const downloadingTag = ref(false)
const hasDownloadedMystery = ref(false)
const hasDownloadedFound = ref(false)

// computed
const getCurrentHint = computed(() => store.getCurrentHint)
const getQueuedTags = computed(() => store.getQueuedTags)

const goMapPage = () => {
  router.push('/map')
}
const goRoundPage = () => {
  router.push('/round')
}
const goWorldwide = () => {
  window.location = 'http://biketag.org/'
  // router.push('/worldwide')
}
const closePopover = () => {
  hintPopover.value.hide({ type: 'click' })
}
const downloadTag = async () => {
  if (downloadingTag.value !== true) {
    const cardBody = Array.from(document.getElementsByClassName('card-body'))
    const img = Array.from(document.getElementsByClassName('img-selector'))
    const imgCopy = img

    cardBody.forEach((element) => {
      element.style.height = 'auto'
      element.style.display = 'block'
    })

    img.forEach((element) => {
      element.style.aspectRatio = 'unset'
      element.style.objectFit = 'unset'
    })

    downloadingTag.value = true
    const downloadPrefix = `BikeTag-${props.tag.game}-${props.tag.tagnumber}--`
    if (!hasDownloadedMystery.value) {
      const mysteryImageDataUrl = await exportHtmlToDownload(
        `${downloadPrefix}mystery`,
        undefined,
        '#the-tag .mystery-tag',
      )
      hasDownloadedMystery.value = !!mysteryImageDataUrl
    }

    if (!hasDownloadedFound.value) {
      const foundImageDataUrl = await exportHtmlToDownload(
        `${downloadPrefix}found`,
        undefined,
        '#the-tag .found-tag',
      )
      hasDownloadedFound.value = !!foundImageDataUrl
    }
    downloadingTag.value = false

    cardBody.forEach((element) => {
      element.style.height = '600px'
      element.style.display = 'flex'
    })

    img.forEach((element, i) => {
      element.style = imgCopy[i].style
    })
  }
}

// before UnMount
onBeforeUnmount(() => {
  document.querySelector('.popover')?.remove()
})
</script>

<style lang="scss">
@import '../assets/styles/style';

.popover {
  background-color: $silver-sand;

  &__wrapper {
    @include background-btn;
    @include flx-center($jc: center);

    background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAyIiBoZWlnaHQ9IjE2MiIgdmlld0JveD0iMCAwIDMwMiAxNjIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQo8cGF0aCBkPSJNMi4wOTQwNiA2NS42NjM5QzIuMDY5NDYgNjUuMzc5MyAyLjA0NDcxIDY1LjA5NDkgMi4wMTk4MiA2NC44MTA2QzEuMjMzMzMgNTUuODI3NiAwLjE4NDUxNSAyOS4xNTU1IDIuMDE5ODIgMjEuMjcyMkM2Ljg1NTA4IDAuNTAzMjM1IDIxLjUyOTQgMTAuNjIyNiAyOC44NDcyIDEwLjYyMjZDMzQuMjMxOCAxMC42MjI2IDM5LjQzMzQgMTIuNTE0MSA0NC43MTE4IDEzLjQ0MTZDNTEuNjczOCAxNC42NjQ5IDYxLjY0MTYgMTUuMTM5MyA2Ny45NzQxIDYuMjM3NDJDNzEuMTMxNCAxLjc5OSA3Ny42MjQ4IDIuMzcxMDUgODEuMDc1OCAyLjE2NTQ5Qzg0LjE5MzMgMS45Nzk4IDg3LjMxNjEgMi4xNjU0OSA5MC40MzQyIDIuMTY1NDlDOTcuMzI2NyAyLjE2NTQ5IDEwNC44OTkgLTAuODM0NjE5IDExMS43MzYgMi43OTE5NEMxMTUuODUgNC45NzQ0MyAxMTkuOTAxIDMuOTUwNjUgMTI0LjAzNSA1LjYxMDk3QzEyNi41NTggNi42MjQxMyAxMjguOTk0IDcuMzk5NzUgMTMxLjUyMiA3LjgwMzU1QzEzMy41MzkgOC4xMjU3OCAxMzQuOTk5IDEzLjA1OTEgMTM2Ljk1OSAxMy40NDE2QzEzNi45NjEgMTMuNDQyIDEzNi45NjMgMTMuNDQyNSAxMzYuOTY1IDEzLjQ0MjlDMTM3LjM3OSAxMy40NDIgMTM3Ljc5MyAxMy40NDE2IDEzOC4yMDYgMTMuNDQxNkgxNjcuNTI5SDE3Ny4yNDRDMTgwLjMyOCAxMy40NDE2IDE4Mi42MTcgNy44MDM1NSAxODUuNDQ0IDcuODAzNTVDMTk3LjA0OSA3LjgwMzU1IDIwOC40ODMgNi4wMzk5MSAyMjAuMDI2IDUuMzAyNTdDMjI1LjI0NSAzLjA5MjgzIDIzMC41NjQgMi4xNjU0OSAyMzUuNjIzIDIuMTY1NDlDMjM4Ljk1OSAyLjE2NTQ5IDI0Mi4xNTggNC45ODQ1MiAyNDUuNDI3IDQuOTg0NTJDMjQ3LjEzMyA0Ljk4NDUyIDI0OC43MzIgNi4yNDQwMyAyNTAuMjk5IDcuNzk0MTFDMjUwLjU0NiA3LjgwMDMzIDI1MC43OTQgNy44MDM1NSAyNTEuMDQyIDcuODAzNTVDMjU1LjYxOCA3LjgwMzU1IDI1OS41MzkgMTQuNTYyMSAyNjQuMzIyIDEzLjQ0MTZDMjY1LjkyOSAxMy4wNjUgMjY2Ljk2NSA4LjA3ODk3IDI2OC42ODkgNy44MDM1NUMyNjkuODcyIDcuNjE0NTIgMjcxLjA2NiA3LjcwNTYzIDI3Mi4yNTYgNy43NjU1MUMyNzMuNjYzIDYuMjMwNjcgMjc1LjExMSA1LjA4MTQ1IDI3Ni43MSA0Ljk4NDUyQzI4MS40IDQuNzAwMzYgMjg2LjE4OCAyLjE2NTQ5IDI5MC41MjUgMi4xNjU0OUMyOTEuNjI0IDIuMTY1NDkgMjkyLjQ2MyA0LjE5ODc1IDI5My4xIDcuMzY2NTFDMjk2LjE1OSA3LjY4MTg3IDI5OC4xOSAxMC45MjQzIDI5OC4xOSAyNy4zODAxQzI5OC4xOSA1My45NTcyIDI5OS43MzUgODIuMjA0MiAyOTguNjIxIDEwOC43MDNDMjk5LjE2OSAxMTMuMDM5IDMwMC4wNTEgMTE3LjQxMSAzMDAuNTA3IDEyMS44MThDMzAyLjY0MSAxNDIuNDM0IDI5Ny4zOTEgMTQ4LjMyNSAyOTMuNDY2IDE1NC4yMzZDMjg4Ljk3NyAxNjAuOTk4IDI4Mi4zMiAxNTcuMjEyIDI3Ny40MjMgMTU3LjIxMkgyNjcuNzA4QzI2NC41ODYgMTU3LjIxMiAyNjIuMDU0IDE1NC4wNjIgMjU5LjMyOCAxNTEuNTc0SDI1MC44NjNDMjQ1Ljk1MSAxNTEuNTc0IDI0MS4zOCAxNDguODU2IDIzNi43ODMgMTQ2LjUwMUMyMzMuNjU2IDE0Ni45MTkgMjMwLjU2OCAxNDcuNzY1IDIyNy42MDEgMTQ5LjA2OEMyMjMuNTM4IDE1MC44NTMgMjE4Ljc1NyAxNTQuNzI3IDIxNC43NjcgMTU4LjYyMkMyMDkuODM2IDE2My40MzUgMjA0LjQ3OCAxNTguNjEyIDE5OS41MjYgMTU3LjM2OUMxODEuMDUyIDE1Mi43MzEgMTYyLjYxIDE1Ny4yMTIgMTQ0LjA0NCAxNTcuMjEyQzE0MC44NDEgMTU3LjIxMiAxMzcuMzcyIDE1OC40OTkgMTM0LjI0IDE1NS42NDZDMTMxLjQ4NCAxNTMuMTM1IDEyOS4wOTkgMTQ3LjU1NSAxMjYuMjE5IDE0Ni4yNDlDMTI2LjE0MSAxNDYuMjE0IDEyNi4wNjMgMTQ2LjE4IDEyNS45ODUgMTQ2LjE0OEMxMjMuNDY2IDE0Ny4wMjEgMTIwLjk2OCAxNDguNzU1IDExOC40MiAxNDguNzU1QzExMC41NzIgMTQ4Ljc1NSAxMDMuNzk1IDE1Mi4xMDMgOTYuMTM4MyAxNTQuNTVDODkuMzc2OCAxNTYuNzEgODIuNTgwNCAxNTcuMTE3IDc1Ljc0IDE1Ny4xOTRDNzAuODMxMSAxNTcuNjY5IDY1Ljg4ODkgMTU3LjIxMiA2MC44ODg0IDE1Ny4yMTJDNTIuNzUxMiAxNTcuMjEyIDQ0Ljc5NTIgMTYwLjAzMSAzNi43MzQ5IDE2MC4wMzFDMjUuNTU2OSAxNjAuMDMxIDE0LjE2NjIgMTYyLjIxMSAzLjAwMDIyIDE2MC4wMzFDMS41NzE5MyAxNTkuNzUyIDEuODg5ODQgOTguMTkxMyAyLjA5NDA2IDY1LjY2MzlaIiBmaWxsPSJ3aGl0ZSIvPg0KPHBhdGggZD0iTTYuMjA4OCAxMzEuODQxQzQuOTU1MDUgMTA4LjcwOSAzLjkxNTIzIDg2LjQ1OTMgMi4wMTk4MiA2NC44MTA2QzEuMjMzMzMgNTUuODI3NiAwLjE4NDUxNSAyOS4xNTU1IDIuMDE5ODIgMjEuMjcyMkM2Ljg1NTA4IDAuNTAzMjM1IDIxLjUyOTQgMTAuNjIyNiAyOC44NDcyIDEwLjYyMjZDMzQuMjMxOCAxMC42MjI2IDM5LjQzMzQgMTIuNTE0MSA0NC43MTE4IDEzLjQ0MTZDNTEuNjczOCAxNC42NjQ5IDYxLjY0MTYgMTUuMTM5MyA2Ny45NzQxIDYuMjM3NDJDNzEuMTMxNCAxLjc5OSA3Ny42MjQ4IDIuMzcxMDUgODEuMDc1OCAyLjE2NTQ5Qzg0LjE5MzMgMS45Nzk4IDg3LjMxNjEgMi4xNjU0OSA5MC40MzQyIDIuMTY1NDlDOTcuMzI2NyAyLjE2NTQ5IDEwNC44OTkgLTAuODM0NjE5IDExMS43MzYgMi43OTE5NEMxMTUuODUgNC45NzQ0MyAxMTkuOTAxIDMuOTUwNjUgMTI0LjAzNSA1LjYxMDk3QzEyNi41NTggNi42MjQxMyAxMjguOTk0IDcuMzk5NzUgMTMxLjUyMiA3LjgwMzU1QzEzMy41MzkgOC4xMjU3OCAxMzUgMTMuMDU5MSAxMzYuOTU5IDEzLjQ0MTZDMTQ1LjgxNiAxNS4xNzEgMTU0LjczMiAxOS4wNzk3IDE2My42MDggMTkuMDc5N0MxNzIuNDk4IDE5LjA3OTcgMTgxLjUzIDE2LjI2MDYgMTkwLjUyNCAxNi4yNjA2QzE5Ni41MTUgMTYuMjYwNiAyMDIuNTU2IDE4LjA1MDUgMjA4LjM1IDEyLjgxNTJDMjE2LjkyOSA1LjA2MiAyMjYuNjgyIDIuMTY1NDkgMjM1LjYyMyAyLjE2NTQ5QzIzOC45NTkgMi4xNjU0OSAyNDIuMTU4IDQuOTg0NTIgMjQ1LjQyNyA0Ljk4NDUyQzI0OS42NTMgNC45ODQ1MiAyNTMuMjE2IDEyLjcwOTEgMjU3LjI4MSAxMy40NDE2QzI2MC42NDkgMTQuMDQ4NyAyNjMuNjE5IDE3LjI3NzMgMjY2LjkwNiAxNC4wNjgxQzI3MC4yNTkgMTAuNzk1IDI3My4wOTYgNS4yMDM1NCAyNzYuNzEgNC45ODQ1MkMyODEuNCA0LjcwMDM2IDI4Ni4xODggMi4xNjU0OSAyOTAuNTI1IDIuMTY1NDlDMjk0LjIzMyAyLjE2NTQ5IDI5NC45ODEgMjUuMzE5OCAyOTQuOTgxIDM3LjA5MDFDMjk0Ljk4MSA1NC4xMTQ1IDI5NS42ODUgNjYuNzU3MyAyOTcuMjk5IDgyLjM1MTJDMjk4LjAwMyA4OS4xNjAxIDI5Ny43ODggOTcuNjkwNiAyOTguMjM1IDEwNC43NDdDMjk4LjU5MSAxMTAuMzc1IDI5OS45MTIgMTE2LjA2OCAzMDAuNTA3IDEyMS44MThDMzAyLjY0MSAxNDIuNDM0IDI5Ny4zOTEgMTQ4LjMyNSAyOTMuNDY2IDE1NC4yMzZDMjg4Ljk3NyAxNjAuOTk4IDI4Mi4zMiAxNTcuMjEyIDI3Ny40MjMgMTU3LjIxMkMyNzQuMTg1IDE1Ny4yMTIgMjcwLjk0NyAxNTcuMjEyIDI2Ny43MDkgMTU3LjIxMkMyNjMuMjcxIDE1Ny4yMTIgMjYwLjAyNSAxNTAuODQ4IDI1NS43MjEgMTQ5LjA2OEMyNDYuNzY2IDE0NS4zNjYgMjM2LjYyMSAxNDUuMTA2IDIyNy42MDEgMTQ5LjA2OEMyMjMuNTM4IDE1MC44NTMgMjE4Ljc1NyAxNTQuNzI3IDIxNC43NjcgMTU4LjYyMkMyMDkuODM2IDE2My40MzUgMjA0LjQ3OCAxNTguNjEyIDE5OS41MjYgMTU3LjM2OUMxODEuMDUyIDE1Mi43MzEgMTYyLjYxIDE1Ny4yMTIgMTQ0LjA0NCAxNTcuMjEyQzE0MC44NDEgMTU3LjIxMiAxMzcuMzcyIDE1OC40OTkgMTM0LjI0IDE1NS42NDZDMTMxLjQ4NCAxNTMuMTM1IDEyOS4wOTkgMTQ3LjU1NSAxMjYuMjE5IDE0Ni4yNDlDMTIxLjE2MSAxNDMuOTU1IDExNS45NzIgMTQ4LjA2OCAxMTAuOTMzIDE0NC41MjZDMTAzLjgxNCAxMzkuNTIyIDk2Ljg2NzYgMTQ2Ljc5OCA4OS45ODg1IDE1MS44ODdDODAuMzg3OSAxNTguOTkgNzAuNzUxNSAxNTcuMjEyIDYwLjg4ODQgMTU3LjIxMkM1Mi43NTEyIDE1Ny4yMTIgNDQuNzk1MyAxNjAuMDMxIDM2LjczNDkgMTYwLjAzMUMyNS41NTY5IDE2MC4wMzEgMTQuMTY2MiAxNjIuMjExIDMuMDAwMjIgMTYwLjAzMUMxLjE3Nzk2IDE1OS42NzUgMi4xOTgwNyA1OS41NjggMi4xOTgwNyA0Ny4yNjk5QzIuMTk4MDcgMzAuNzc4IDcuODE1ODggMjEuODk4NyAxMi4wMDIxIDIxLjg5ODdDMTYuNDA1MSAyMS44OTg3IDIwLjMwMjIgMTYuMjYwNiAyNC42NTgyIDE2LjI2MDZDMjkuMTQ0MiAxNi4yNjA2IDMzLjYzMDMgMTYuMjYwNiAzOC4xMTY0IDE2LjI2MDZDNzEuNDc3OSAxNi4yNjA2IDEwNC45MjQgMTMuNDQxNiAxMzguMjA2IDEzLjQ0MTZDMTQ3Ljk4MSAxMy40NDE2IDE1Ny43NTUgMTMuNDQxNiAxNjcuNTI5IDEzLjQ0MTZDMTcwLjc2OCAxMy40NDE2IDE3NC4wMDYgMTMuNDQxNiAxNzcuMjQ0IDEzLjQ0MTZDMTgwLjMyOCAxMy40NDE2IDE4Mi42MTcgNy44MDM1NSAxODUuNDQ0IDcuODAzNTVDMjAwLjExNyA3LjgwMzU1IDIxNC41MTQgNC45ODQ1MiAyMjkuMjA1IDQuOTg0NTJDMjM2LjU2NyA0Ljk4NDUyIDI0My43MDkgNy44MDM1NSAyNTEuMDQyIDcuODAzNTVDMjU1LjYxOCA3LjgwMzU1IDI1OS41MzkgMTQuNTYyMSAyNjQuMzIyIDEzLjQ0MTZDMjY1LjkyOSAxMy4wNjUgMjY2Ljk2NSA4LjA3ODk3IDI2OC42ODkgNy44MDM1NUMyNzAuMjg2IDcuNTQ4NDQgMjcxLjkwMiA3LjgwMzU1IDI3My41MDIgNy44MDM1NUMyNzguMjU1IDcuODAzNTUgMjgzLjAwOSA3LjgwMzU1IDI4Ny43NjIgNy44MDM1NUMyOTMuNTY2IDcuODAzNTUgMjk4LjE5IDIuNTUwMjYgMjk4LjE5IDI3LjM4MDFDMjk4LjE5IDYwLjM0MzYgMzAwLjU2NiA5NS44NzU4IDI5Ny4yOTkgMTI3LjQ1NkMyOTYuMDMzIDEzOS42ODQgMjkzLjgxNSAxNTEuNTc0IDI4OS44MTIgMTUxLjU3NEMyODQuMTY3IDE1MS41NzQgMjc4LjUyMyAxNTEuNTc0IDI3Mi44NzggMTUxLjU3NEMyNjUuNTQgMTUxLjU3NCAyNTguMjAyIDE1MS41NzQgMjUwLjg2MyAxNTEuNTc0QzI0Mi4xOTkgMTUxLjU3NCAyMzQuNTk2IDE0My4xMTcgMjI2LjA0MSAxNDMuMTE3QzIxOS4xNzkgMTQzLjExNyAyMTIuMzE2IDE0My4xMTcgMjA1LjQ1MyAxNDMuMTE3QzIwMS4wMTYgMTQzLjExNyAxOTYuNzM3IDE0MC4yOTggMTkyLjMwNyAxNDAuMjk4QzE4Ny4yNTEgMTQwLjI5OCAxODIuMTc3IDE0My4xMTcgMTc3LjA2NiAxNDMuMTE3QzE3Mi4xNTYgMTQzLjExNyAxNjcuNDA2IDE0OC43NTUgMTYyLjQ5NCAxNDguNzU1QzE1Ny4xNTQgMTQ4Ljc1NSAxNTIuMTg1IDE1NC4zOTMgMTQ3LjAzIDE1NC4zOTNDMTQxLjQ2NiAxNTQuMzkzIDEzNi4zMTUgMTQ5LjA0NiAxMzAuOTQzIDE0Ni4yNDlDMTI2LjY5IDE0NC4wMzUgMTIyLjYyMiAxNDguNzU1IDExOC40MiAxNDguNzU1QzExMC41NzIgMTQ4Ljc1NSAxMDMuNzk1IDE1Mi4xMDMgOTYuMTM4MyAxNTQuNTVDODcuODMzNSAxNTcuMjAzIDc5LjQ3NiAxNTcuMjEyIDcxLjA0OSAxNTcuMjEyQzU0LjA1MTMgMTU3LjIxMiAzNy4yMDk4IDE1NC4zOTMgMjAuMjAxOCAxNTQuMzkzQzE0LjA4NDkgMTU0LjM5MyA4Ljk0IDE0Ni40MTMgMy4wNDQ3OCAxNDIuOTZDMS4zNDg2MyAxNDEuOTY3IDIuMTk4MDcgMTA0Ljg3OCAyLjE5ODA3IDk4LjAxMjUiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQo8L3N2Zz4NCg==');
    min-width: 300px;
    min-height: 170px;
    background-color: unset;
    border: unset;

    .popover-arrow {
      display: none;
    }

    .popover-body {
      width: 100%;
    }

    @media (min-width: $breakpoint-mobile-md) {
      min-width: 350px;
      min-height: 190px;
    }

    @media (min-width: $breakpoint-tablet) {
      min-width: 400px;
      min-height: 210px;
    }
  }

  &__hint-icon {
    position: absolute;
    left: -15px;
    top: -30px;
  }

  &__close {
    position: absolute;
    top: -7px;
    right: 0;
    cursor: pointer;
  }

  &__hint-text {
    font-weight: 900;
    font-size: 2rem;
    font-family: $default-secondary-font-family;
    cursor: default;
    white-space: pre-wrap;
    text-transform: uppercase;
    margin: 10px;
    overflow: auto;
    margin-left: auto;
  }
}
</style>
<style scoped lang="scss">
@import '../assets/styles/style';

.foss-container {
  i {
    margin: auto;
    padding: 2em;
    max-width: 70%;
    color: black;
  }

  @media (min-width: $breakpoint-mobile-sm) {
    i {
      max-width: 90%;
    }
  }

  @media (min-width: $breakpoint-mobile-md) {
    i {
      max-width: 80%;
    }
  }
}

.footer-image {
  height: 40px;
}

.popover__close {
  position: absolute;
  top: -15px;
  right: -15px;
  z-index: 10;
}

.button-group {
  display: flex;
  justify-content: center;
  align-items: center;

  // &__left {
  // }

  &__middle {
    margin-left: 0.5rem;
  }

  &__right {
    margin-left: 0.5rem;
  }
}
</style>
