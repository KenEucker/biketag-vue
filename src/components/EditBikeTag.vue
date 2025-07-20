<template>
  <div>
    <BikeTag :tag="editableTag">
      <!-- Editable mystery player -->
      <template #mysteryPlayer>
        <label class="edit-label">Mystery Player</label>
        <input
          v-model="editableTag.mysteryPlayer"
          @blur="save('mysteryPlayer')"
        />
      </template>

      <!-- Editable mystery time -->
      <template #mysteryTime>
        <label class="edit-label">Mystery Time</label>
        <DatePicker
          v-model="mysteryDate"
          :enable-time-picker="true"
          @update:model-value="onDateChange('mysteryTime', $event)"
        />
      </template>

      <!-- Editable found player -->
      <template #foundPlayer>
        <label class="edit-label">Found Player</label>
        <input
          v-model="editableTag.foundPlayer"
          @blur="save('foundPlayer')"
        />
      </template>

      <!-- Editable found time -->
      <template #foundTime>
        <label class="edit-label">Found Time</label>
        <DatePicker
          v-model="foundDate"
          :enable-time-picker="true"
          @update:model-value="onDateChange('foundTime', $event)"
        />
      </template>

      <!-- Editable found location -->
      <template #foundLocation>
        <label class="edit-label">Found Location</label>
        <input
          v-model="editableTag.foundLocation"
          @blur="save('foundLocation')"
        />
      </template>

      <!-- Editable mystery description / hint -->
      <template #mysteryDescription>
        <label class="edit-label">Hint</label>
        <input
          v-model="editableTag.hint"
          @blur="save('hint')"
        />
      </template>

      <!-- Editable gps -->
      <template #gps>
        <label class="edit-label">GPS Coordinates</label>
        <input
          v-model="editableTag.gps"
          @blur="save('gps')"
        />
      </template>
    </BikeTag>
  </div>
</template>

<script setup lang="ts">
import DatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import type { Tag } from 'biketag';
import { reactive, ref, toRaw, watch } from 'vue';
import BikeTag from './BikeTag.vue';

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
  editableTag.mysteryTime ? new Date(editableTag.mysteryTime * 1000) : null
)

const foundDate = ref<Date | null>(
  editableTag.foundTime ? new Date(editableTag.foundTime * 1000) : null
)

const emit = defineEmits(['update'])

const save = (field: EditableField) => {
  console.log(`Saving ${field}:`, editableTag[field])
  emit('update', {
    field,
    value: editableTag[field],
    tag: toRaw(editableTag)
  })
}

const onDateChange = (field: 'mysteryTime' | 'foundTime', date: Date | null) => {
  if (date) {
    const epochSeconds = Math.floor(date.getTime() / 1000)
    editableTag[field] = epochSeconds
    save(field)
  }
}

// Sync prop changes if needed (optional but robust)
watch(() => props.tag, (newTag) => {
  Object.assign(editableTag, newTag)
  mysteryDate.value = newTag.mysteryTime ? new Date(newTag.mysteryTime * 1000) : null
  foundDate.value = newTag.foundTime ? new Date(newTag.foundTime * 1000) : null
}, { deep: true })

</script>

<style scoped>
input {
  width: 100%;
  font-size: 1rem;
  padding: 0.25rem;
  margin-bottom: 0.5rem;
  box-sizing: border-box;
}

.edit-label {
  display: block;
  font-weight: bold;
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
}
</style>
