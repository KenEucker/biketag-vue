<!-- eslint-disable vue/multi-word-component-names -->
<template>
    <loading v-show="isLoading" v-model:active="isLoading" :is-full-page="true" class="realign-spinner">
        <img class="spinner" src="@/assets/images/SpinningBikeV1.svg" alt="Loading..." />
    </loading>

    <div class="queue-page">
        <div v-if="!isBikeTagAmbassador && !pageLoading">
            <h2>Ambassador Access Required</h2>
            <p>You must be logged in as a BikeTag Ambassador to launch a game.</p>
            <bike-tag-button @click="router.push({ name: 'Dashboard' })">
                Go to Dashboard
            </bike-tag-button>
        </div>

        <div v-else-if="!canLaunchGame && !pageLoading">
            <h2>Game Already Started</h2>
            <p>This game already has a tag #1. Use Create New Round to post the next tag.</p>
            <bike-tag-button @click="router.push({ name: 'Dashboard' })">
                Go to Dashboard
            </bike-tag-button>
        </div>

        <div v-else-if="submitSuccess">
            {{ getGameNameProper }} has been launched with tag #1!
            <bike-tag-button @click="router.push({ name: 'Home' })">
                Go to the Home Page
            </bike-tag-button>
        </div>

        <div v-else-if="!pageLoading">
            <h2>Launch {{ getGameNameProper }}</h2>
            <p class="round-number">Tag #1 — Mystery Image</p>
            <p class="launch-description">
                Set the first mystery image, hint, and credit to start the game.
            </p>
            <div class="biketag-container">
                <EditBikeTag
                    :tag="launchTag"
                    allow-image-upload
                    mystery-only
                    @update="onFieldUpdate"
                />
            </div>

            <bike-tag-button variant="light" class="big-btn" @click="onSubmitClick">
                Launch Game
            </bike-tag-button>
        </div>

        <form ref="submitError" name="launch-game-error" action="launch-game-error" method="POST" data-netlify="true"
            data-netlify-honeypot="bot-field" hidden>
            <input type="hidden" name="form-name" value="launch-game-error" />
            <input type="hidden" name="ambassadorId" :value="getAmbassadorId" />
            <input type="hidden" name="message" />
            <input type="hidden" name="ip" value="" />
        </form>
    </div>
</template>

<script setup name="LaunchGame">
import { computed, inject, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { sendNetlifyError, sendNetlifyForm } from '@/common'
import { useBikeTagStore } from '@/store/index'

import BikeTagButton from '@/components/BikeTagButton.vue'
import EditBikeTag from '@/components/EditBikeTag.vue'
import Loading from 'vue-loading-overlay'

const store = useBikeTagStore()
const router = useRouter()
const toast = inject('toast')
const { t } = useI18n()

const submitInProgress = ref(false)
const submitSuccess = ref(false)
const pageLoading = ref(true)
const submitError = ref(null)

const isLoading = computed({
    get: () => submitInProgress.value || pageLoading.value,
    set: (value) => {
        if (!value) {
            submitInProgress.value = false
            pageLoading.value = false
        }
    },
})

const getGameName = computed(() => store.getGameName)
const getGameNameProper = computed(() => store.getGameNameProper)
const getAmbassadorId = computed(() => store.getAmbassadorId)
const isBikeTagAmbassador = computed(() => store.isBikeTagAmbassador)
const canLaunchGame = computed(() => store.canLaunchGame)

const launchTag = reactive({
    game: getGameName.value,
    tagnumber: 1,
    playerId: '',
    mysteryPlayer: '',
    mysteryTime: Math.floor(Date.now() / 1000),
    mysteryImageUrl: '',
    mysteryImage: null,
    hint: '',
})

async function onFieldUpdate({ field, value, tag }) {
    if (tag) {
        Object.assign(launchTag, tag)
        return
    }
    if (field) {
        launchTag[field] = value
    }
}

async function onSubmitClick() {
    if (!launchTag.mysteryImage && !launchTag.mysteryImageUrl) {
        toast.open({
            message: 'Please add a mystery image before launching.',
            type: 'error',
            position: 'top',
        })
        return
    }
    if (!launchTag.mysteryPlayer?.length) {
        toast.open({
            message: 'Please select or enter a player name for credit.',
            type: 'error',
            position: 'top',
        })
        return
    }

    submitInProgress.value = true
    const errorAction = submitError.value.getAttribute('action')

    const result = await store.launchGameTag(launchTag)
    submitInProgress.value = false

    if (result === true) {
        store.resetBikeTagCache()
        return sendNetlifyForm(
            'launch-game-success',
            `game=${getGameName.value}`,
            () => {
                toast.open({
                    message: 'Game launched!',
                    type: 'success',
                    position: 'top',
                })
                submitSuccess.value = true
            },
            (m) => {
                toast.open({
                    message: `${t('notifications.error')} ${m}`,
                    type: 'error',
                    duration: 10000,
                    timeout: false,
                    position: 'bottom',
                })
                return sendNetlifyError(m, undefined, errorAction)
            }
        )
    } else {
        const message = `Error launching game: ${result}`
        toast.open({
            message,
            type: 'error',
            duration: 10000,
            timeout: false,
            position: 'bottom',
        })
        console.error(message)
        return sendNetlifyError(message, undefined, errorAction)
    }
}

onMounted(async () => {
    await store.isReady()
    await store.fetchPlayers()
    launchTag.game = getGameName.value
    launchTag.tagnumber = 1
    launchTag.mysteryTime = Math.floor(Date.now() / 1000)
    pageLoading.value = false
})
</script>

<style scoped>
.biketag-container {
    max-width: clamp(80vw, 80vw, 500px);
    margin: auto;
}

.round-number {
    text-align: center;
    font-weight: bold;
    margin-bottom: 0.5rem;
}

.launch-description {
    text-align: center;
    margin-bottom: 1rem;
}
</style>
