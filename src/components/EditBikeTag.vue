<template>
  <div>
    <BikeTag :tag="editableTag">
      <!-- Mystery Player -->
      <template #mysteryPlayer>
        <div class="edit-field">
          <label class="edit-label" :for="inputId('mysteryPlayer')">Mystery Player</label>
          <input
            :id="inputId('mysteryPlayer')"
            v-model="editableTag.mysteryPlayer"
            @blur="save('mysteryPlayer')"
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
import { reactive, ref, toRaw, watch } from 'vue'
import BikeTag from './BikeTag.vue'

type EditableField =
  | 'mysteryPlayer'
  | 'mysteryTime'
  | 'foundPlayer'
  | 'foundTime'
  | 'foundLocation'
  | 'hint'
  | 'gps'

const props = defineProps<{
  tag: Tag
}>()

const editableTag = reactive<Tag>({ ...props.tag })

const mysteryDate = ref<Date | null>(
  editableTag.mysteryTime ? new Date(editableTag.mysteryTime * 1000) : null,
)

const foundDate = ref<Date | null>(
  editableTag.foundTime ? new Date(editableTag.foundTime * 1000) : null,
)

const emit = defineEmits(['update'])

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

watch(
  () => props.tag,
  (newTag) => {
    Object.assign(editableTag, newTag)
    mysteryDate.value = newTag.mysteryTime ? new Date(newTag.mysteryTime * 1000) : null
    foundDate.value = newTag.foundTime ? new Date(newTag.foundTime * 1000) : null
  },
  { deep: true },
)

// Generates a unique id for each input/label pair
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
.edit-field ::deep(.dp__input) {
  width: 100%;
  font-size: 1rem;
  padding: 0.25rem;
  box-sizing: border-box;
}
</style>
