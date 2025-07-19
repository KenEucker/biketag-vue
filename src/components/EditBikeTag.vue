<template>
  <div>
    <BikeTag :tag="editableTag">
      <!-- Editable mystery player -->
      <template #mysteryPlayer>
        <input
          v-model="editableTag.mysteryPlayer"
          @blur="save('mysteryPlayer')"
          placeholder="Mystery Player"
        />
      </template>

      <!-- Editable mystery time -->
      <template #mysteryTime>
        <input
          v-model="editableTag.mysteryTime"
          @blur="save('mysteryTime')"
          placeholder="Mystery Time"
          type="number"
        />
      </template>

      <!-- Editable found player -->
      <template #foundPlayer>
        <input
          v-model="editableTag.foundPlayer"
          @blur="save('foundPlayer')"
          placeholder="Found Player"
        />
      </template>

      <!-- Editable found time -->
      <template #foundTime>
        <input
          v-model="editableTag.foundTime"
          @blur="save('foundTime')"
          placeholder="Found Time"
          type="number"
        />
      </template>

      <!-- Editable found location -->
      <template #foundLocation>
        <input
          v-model="editableTag.foundLocation"
          @blur="save('foundLocation')"
          placeholder="Found Location"
        />
      </template>

      <!-- Editable mystery description / hint -->
      <template #mysteryDescription>
        <input
          v-model="editableTag.hint"
          @blur="save('hint')"
          placeholder="Hint"
        />
      </template>

      <!-- Editable gps (optional; not rendered by default in BikeTag) -->
      <template #gps>
        <input
          v-model="editableTag.gps"
          @blur="save('gps')"
          placeholder="GPS Coordinates"
        />
      </template>
    </BikeTag>
  </div>
</template>

<script setup lang="ts">
import { Tag } from 'biketag';
import { reactive, toRaw } from 'vue';
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

const emit = defineEmits(['update'])

const save = (field: EditableField) => {
  console.log(`Saving ${field}:`, editableTag[field])

  // You can replace this with actual API call:
  // await api.updateTag(editableTag)

  emit('update', {
    field,
    value: editableTag[field],
    tag: toRaw(editableTag)
  })
}
</script>

<style scoped>
input {
  width: 100%;
  font-size: 1rem;
  padding: 0.25rem;
  margin: 0.25rem 0;
  box-sizing: border-box;
}
</style>
