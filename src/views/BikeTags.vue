<template>
  <Searchable
    item-type="biketags"
    :items="store.getTags.slice(1)"
    :search-algo="tagSearch"
    main-route="BikeTags"
    search-route="BikeTag Search"
  >
    <template #content="{ displayedItems }">
      <div class="small-margin">
        <div v-for="tag in displayedItems" :key="tag.tagnumber">
          <bike-tag :tag="tag" :reverse="true" />
        </div>
      </div>
    </template>
  </Searchable>
</template>

<script setup name="BikeTagsView">
import Searchable from '@/components/Searchable.vue'
import BikeTag from '@/components/BikeTag.vue'
import { useBikeTagStore } from '@/store/index'

const store = useBikeTagStore()

const tagSearch = (tags, searchString) => {
  const query = searchString.toLowerCase()

  const searchedNumber = query.match(/^#?(\d+)$/)?.[1]
  const foundByNumber = []

  const splitQuery = query.split(/\s+/)
  const tagToScore = new Map()
  for (const tag of tags) {
    if (searchedNumber && !foundByNumber.length && String(tag.tagnumber) === searchedNumber) {
      foundByNumber[0] = tag
      continue
    }

    const stringFields = [
      tag.mysteryPlayer?.toLowerCase(),
      tag.foundPlayer?.toLowerCase(),
      tag.hint?.toLowerCase(),
      tag.foundLocation?.toLowerCase(),
    ]
    let score = 0
    for (const field of stringFields) {
      if (field?.includes(query)) {
        score++
      }
      for (const word of splitQuery) {
        if (field?.includes(word)) {
          score++
        }
      }
    }
    tagToScore.set(tag, score)
  }

  const sortedResults = tags
    .filter((tag) => tagToScore.get(tag) > 0)
    .toSorted((a, b) => tagToScore.get(a) - tagToScore.get(b))
  return foundByNumber.concat(sortedResults)
}
</script>
