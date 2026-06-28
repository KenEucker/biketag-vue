<template>
  <div>
    <BikeTag
      :tag="editableTag"
      :found-tagnumber="editableTag?.tagnumber - 1"
      :found-description="editableTag?.foundLocation"
      :always-show-sections="allowImageUpload"
    >
      <template v-if="allowImageUpload" #foundImage>
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
        <div class="edit-field">
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
      <template #foundPlayer>
        <div class="edit-field">
          <label class="edit-label" :for="inputId('foundPlayer')">Found Player</label>
          <input
            :id="inputId('foundPlayer')"
            v-model="editableTag.foundPlayer"
            :readonly="lockPlayers"
            @blur="save('foundPlayer')"
          />
        </div>
      </template>

      <!-- Found Time -->
      <template #foundTime>
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
      <template #foundLocation>
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
import type { Tag } from 'biketag'
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
  | 'foundImage'
  | 'mysteryImage'
  | 'foundImageUrl'
  | 'mysteryImageUrl'

const props = withDefaults(
  defineProps<{
    tag: Tag
    allowImageUpload?: boolean
  }>(),
  {
    allowImageUpload: false,
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

const lockPlayers = ref(false)

onMounted(() => {
  if (editableTag.foundPlayer === editableTag.mysteryPlayer) {
    lockPlayers.value = true
  } else if (editableTag.foundPlayer || editableTag.mysteryPlayer) {
    console.warn(
      '[EditBikeTag] Players initially different, fallback to independent editing:',
      editableTag.mysteryPlayer,
      editableTag.foundPlayer,
    )
  } else if (props.allowImageUpload) {
    lockPlayers.value = true
  }
})

const save = (field: EditableField) => {
  emit('update', {
    field,
    value: editableTag[field],
    tag: toRaw(editableTag),
  })
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
  save('mysteryPlayer')
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

.edit-field input {
  width: 100%;
  font-size: 1rem;
  padding: 0.25rem;
  box-sizing: border-box;
}

.image-upload {
  position: relative;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: 2px dashed #ccc;
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
