<template>
  <div>
    <BikeTag
      :tag="editableTag"
      :found-tagnumber="editableTag?.tagnumber - 1"
      :found-description="editableTag?.foundLocation"
      :always-show-sections="allowImageUpload"
      :hide-found-section="mysteryOnly"
    >
      <template v-if="allowImageUpload && !mysteryOnly" #foundImage>
        <div class="image-upload">
          <img
            v-if="foundPreview"
            class="image img-fluid"
            :src="foundPreview"
            alt="Found image preview"
          />
          <label v-else class="image-upload-label" :for="inputId('foundImage')">
            Add Found Image
          </label>
          <input
            :id="inputId('foundImage')"
            type="file"
            accept="image/*"
            class="image-upload-input"
            @change="onImageChange('found', $event)"
          />
        </div>
      </template>

      <template v-if="allowImageUpload" #mysteryImage>
        <div class="image-upload">
          <img
            v-if="mysteryPreview"
            class="image img-fluid"
            :src="mysteryPreview"
            alt="Mystery image preview"
          />
          <label v-else class="image-upload-label" :for="inputId('mysteryImage')">
            Add Mystery Image
          </label>
          <input
            :id="inputId('mysteryImage')"
            type="file"
            accept="image/*"
            class="image-upload-input"
            @change="onImageChange('mystery', $event)"
          />
        </div>
      </template>

      <!-- Mystery Player -->
      <template #mysteryPlayer>
        <div v-if="allowImageUpload" class="edit-field player-picker">
          <label class="edit-label" :for="inputId('playerSelect')">
            {{ mysteryOnly ? 'Credit' : 'Player' }}
          </label>
          <select
            :id="inputId('playerSelect')"
            v-model="playerSelection"
            class="player-select"
            @change="onPlayerSelectionChange"
          >
            <option value="">Select a player...</option>
            <option v-for="player in sortedPlayers" :key="player.name" :value="player.name">
              {{ player.name }}
            </option>
            <option value="__new__">Enter new name...</option>
          </select>
          <input
            v-if="playerSelection === '__new__'"
            :id="inputId('mysteryPlayer')"
            v-model="customPlayerName"
            class="player-name-input"
            placeholder="New player name"
            @input="onCustomPlayerInput"
          />
          <p v-else-if="editableTag.mysteryPlayer" class="player-selected-name">
            {{ editableTag.mysteryPlayer }}
          </p>
        </div>
        <div v-else class="edit-field">
          <label class="edit-label" :for="inputId('mysteryPlayer')">Mystery Player</label>
          <input
            :id="inputId('mysteryPlayer')"
            v-model="editableTag.mysteryPlayer"
            @input="onMysteryPlayerInput"
          />
        </div>
      </template>

      <!-- Mystery Time -->
      <template #mysteryTime>
        <div class="edit-field">
          <label class="edit-label" :for="inputId('mysteryTime')">Mystery Time</label>
          <DatePicker
            :id="inputId('mysteryTime')"
            v-model="mysteryDate"
            :enable-time-picker="true"
            @update:model-value="onDateChange('mysteryTime', $event)"
          />
        </div>
      </template>

      <!-- Found Player -->
      <template v-if="!mysteryOnly" #foundPlayer>
        <div class="edit-field">
          <label class="edit-label" :for="inputId('foundPlayer')">Found Player</label>
          <input
            :id="inputId('foundPlayer')"
            v-model="editableTag.foundPlayer"
            :readonly="lockPlayers || allowImageUpload"
            @blur="save('foundPlayer')"
          />
        </div>
      </template>

      <!-- Found Time -->
      <template v-if="!mysteryOnly" #foundTime>
        <div class="edit-field">
          <label class="edit-label" :for="inputId('foundTime')">Found Time</label>
          <DatePicker
            :id="inputId('foundTime')"
            v-model="foundDate"
            :enable-time-picker="true"
            @update:model-value="onDateChange('foundTime', $event)"
          />
        </div>
      </template>

      <!-- Found Location -->
      <template v-if="!mysteryOnly" #foundLocation>
        <div class="edit-field">
          <label class="edit-label" :for="inputId('foundLocation')">Found Location</label>
          <input
            :id="inputId('foundLocation')"
            v-model="editableTag.foundLocation"
            @blur="save('foundLocation')"
          />
        </div>
      </template>

      <!-- Hint -->
      <template #mysteryDescription>
        <div class="edit-field">
          <label class="edit-label" :for="inputId('hint')">Hint</label>
          <input :id="inputId('hint')" v-model="editableTag.hint" @blur="save('hint')" />
        </div>
      </template>

      <!-- GPS Coordinates -->
      <template #gps>
        <div class="edit-field">
          <label class="edit-label" :for="inputId('gps')">GPS Coordinates</label>
          <input :id="inputId('gps')" v-model="editableTag.gps" @blur="save('gps')" />
        </div>
      </template>
    </BikeTag>
  </div>
</template>

<script setup lang="ts">
import DatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import type { Player, Tag } from 'biketag'
import { useBikeTagStore } from '@/store/index'
import { computed, onMounted, reactive, ref, toRaw, watch } from 'vue'
import BikeTag from './BikeTag.vue'

type EditableField =
  | 'mysteryPlayer'
  | 'mysteryTime'
  | 'foundPlayer'
  | 'foundTime'
  | 'foundLocation'
  | 'hint'
  | 'gps'
  | 'playerId'
  | 'foundImage'
  | 'mysteryImage'
  | 'foundImageUrl'
  | 'mysteryImageUrl'

const props = withDefaults(
  defineProps<{
    tag: Tag
    allowImageUpload?: boolean
    mysteryOnly?: boolean
  }>(),
  {
    allowImageUpload: false,
    mysteryOnly: false,
  },
)

const editableTag = reactive<Tag>({ ...props.tag })

const mysteryDate = ref<Date | null>(
  editableTag.mysteryTime ? new Date(editableTag.mysteryTime * 1000) : null,
)

const foundDate = ref<Date | null>(
  editableTag.foundTime ? new Date(editableTag.foundTime * 1000) : null,
)

const foundPreview = computed(
  () => editableTag.foundImageUrl || (editableTag as Tag & { foundPreview?: string }).foundPreview,
)
const mysteryPreview = computed(
  () =>
    editableTag.mysteryImageUrl || (editableTag as Tag & { mysteryPreview?: string }).mysteryPreview,
)

const emit = defineEmits(['update'])
const store = useBikeTagStore()

const lockPlayers = ref(false)
const playerSelection = ref('')
const customPlayerName = ref('')

const sortedPlayers = computed(() =>
  [...(store.getPlayers as Player[])].sort((a, b) => a.name.localeCompare(b.name)),
)

onMounted(async () => {
  if (props.allowImageUpload) {
    lockPlayers.value = !props.mysteryOnly
    if (!store.getPlayers?.length) {
      await store.fetchPlayers()
    }
    if (editableTag.mysteryPlayer?.length) {
      const isExistingPlayer = sortedPlayers.value.some((p) => p.name === editableTag.mysteryPlayer)
      playerSelection.value = isExistingPlayer ? editableTag.mysteryPlayer : '__new__'
      if (playerSelection.value === '__new__') {
        customPlayerName.value = editableTag.mysteryPlayer
      }
    }
    return
  }

  if (editableTag.foundPlayer === editableTag.mysteryPlayer) {
    lockPlayers.value = true
  } else if (editableTag.foundPlayer || editableTag.mysteryPlayer) {
    console.warn(
      '[EditBikeTag] Players initially different, fallback to independent editing:',
      editableTag.mysteryPlayer,
      editableTag.foundPlayer,
    )
  }
})

const save = (field?: EditableField) => {
  emit('update', {
    field,
    value: field ? editableTag[field] : undefined,
    tag: toRaw(editableTag),
  })
}

const syncLockedPlayers = (name: string, playerId = '') => {
  editableTag.mysteryPlayer = name
  editableTag.playerId = playerId
  if (!props.mysteryOnly) {
    editableTag.foundPlayer = name
  }
  save()
}

const resolvePlayerId = async (name: string): Promise<string> => {
  const fromCurrentTag =
    store.getCurrentBikeTag?.mysteryPlayer === name
      ? store.getCurrentBikeTag.playerId
      : undefined
  if (fromCurrentTag) return fromCurrentTag

  const fromTags = [...store.getTags, ...store.getQueuedTags].find(
    (tag) => (tag.mysteryPlayer === name || tag.foundPlayer === name) && tag.playerId,
  )
  if (fromTags?.playerId) return fromTags.playerId

  const fromPlayer = sortedPlayers.value.find((player) => player.name === name) as Player & {
    sub?: string
  }
  if (fromPlayer?.sub) return fromPlayer.sub

  const profile = await store.fetchPlayerProfile(name)
  return profile?.sub ?? ''
}

const onPlayerSelectionChange = async () => {
  if (!playerSelection.value) {
    syncLockedPlayers('', '')
    return
  }

  if (playerSelection.value === '__new__') {
    customPlayerName.value = ''
    syncLockedPlayers('', '')
    return
  }

  customPlayerName.value = ''
  const playerId = await resolvePlayerId(playerSelection.value)
  syncLockedPlayers(playerSelection.value, playerId)
}

const onCustomPlayerInput = () => {
  syncLockedPlayers(customPlayerName.value, '')
}

const onDateChange = (field: 'mysteryTime' | 'foundTime', date: Date | null) => {
  if (date) {
    const epochSeconds = Math.floor(date.getTime() / 1000)
    editableTag[field] = epochSeconds
    save(field)
  }
}

const onMysteryPlayerInput = (e: Event) => {
  const val = (e.target as HTMLInputElement).value
  editableTag.mysteryPlayer = val
  if (lockPlayers.value) {
    editableTag.foundPlayer = val
  }
  save()
}

const onImageChange = (type: 'found' | 'mystery', event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const previewReader = new FileReader()
  previewReader.onload = (e) => {
    const previewUrl = e.target?.result as string
    if (type === 'found') {
      ;(editableTag as Tag & { foundPreview?: string }).foundPreview = previewUrl
      editableTag.foundImage = file
      save('foundImage')
    } else {
      ;(editableTag as Tag & { mysteryPreview?: string }).mysteryPreview = previewUrl
      editableTag.mysteryImage = file
      save('mysteryImage')
    }
  }
  previewReader.readAsDataURL(file)
}

watch(
  () => props.tag,
  (newTag) => {
    Object.assign(editableTag, newTag)
    mysteryDate.value = newTag.mysteryTime ? new Date(newTag.mysteryTime * 1000) : null
    foundDate.value = newTag.foundTime ? new Date(newTag.foundTime * 1000) : null
  },
  { deep: true },
)

const inputId = (field: string) => `edit-biketag-${field}`
</script>

<style scoped>
.edit-label {
  display: block;
  font-weight: bold;
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
}

.edit-field {
  width: 100%;
  margin-bottom: 0.5rem;
}

.edit-field input,
.edit-field select {
  width: 100%;
  font-size: 1rem;
  padding: 0.25rem;
  box-sizing: border-box;
}

.player-select {
  margin-bottom: 0.5rem;
}

.player-name-input {
  margin-top: 0.5rem;
}

.player-selected-name {
  margin: 0.5rem 0 0;
  font-weight: bold;
  text-align: center;
}

.image-upload {
  position: relative;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: 2px dashed #ccc;
  overflow: hidden;
}

.image-upload-label {
  cursor: pointer;
  font-weight: bold;
  padding: 1rem;
  text-align: center;
}

.image-upload-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
</style>
