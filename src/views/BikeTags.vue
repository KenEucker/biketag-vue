<template>
  <div v-if="totalCount > 1" class="container">
    <b-pagination
      v-model="currentPage"
      :total-rows="totalCount"
      :per-page="perPage"
      aria-controls="itemList"
      align="center"
      @page-click="changePage"
    ></b-pagination>
    <div class="small-margin">
      <div v-for="tag in tagsList" :key="tag.tagnumber">
        <bike-tag :key="tag.tagnumber" :tag="tag" :reverse="true" />
      </div>
    </div>
    <b-form-group>
      <select v-model="perPage" class="form-select mb-2 m-auto" @change="resetCurrentPage">
        <option v-for="i in 3" :key="Math.pow(10, i)" :value="Math.pow(10, i)">
          {{ Math.pow(10, i) }}
        </option>
      </select>
    </b-form-group>
    <b-pagination
      v-model="currentPage"
      :total-rows="totalCount"
      :per-page="perPage"
      aria-controls="itemList"
      align="center"
      @page-click="changePage"
    ></b-pagination>
  </div>
  <div v-else class="container mt-4 mb-5">
    <span class="body-text">
      completed BikeTag Posts will show up here once round #1 has been found!
    </span>
  </div>
  <loading v-if="tagsAreLoading" v-model:active="tagsAreLoading" :is-full-page="true">
    <img class="spinner" src="@/assets/images/SpinningBikeV1.svg" alt="Loading..." />
  </loading>
</template>

<script setup name="BikeTagsView">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBikeTagStore } from '@/store/index'
import 'vue-loading-overlay/dist/vue-loading.css'

// components
import BikeTag from '@/components/BikeTag.vue'
import Loading from 'vue-loading-overlay'

// data
const router = useRouter()
const route = useRoute()
const currentPage = ref(route.params?.currentPage.length ? parseInt(route.params?.currentPage) : 1)
const perPage = ref(10)
const tagsAreLoading = ref(true)
const tagsLoaded = ref([])
const store = useBikeTagStore()

// computed
const getTags = computed(() => store.getTags)
const tagsList = computed(() =>
  getTags.value.slice(
    (currentPage.value - 1) * perPage.value + (currentPage.value === 1 ? 1 : 0), // exclude current mystery tag
    currentPage.value * perPage.value, // exclude current mystery tag
  ),
)
const totalCount = computed(() => getTags.value.length)

// methods
function resetCurrentPage() {
  startLoading()
  currentPage.value = 1
}
function changePage(event, pageNumber) {
  startLoading()
  router.push('/biketags/' + pageNumber)
}
function startLoading() {
  tagsLoaded.value = []
  tagsAreLoading.value = true
  if (perPage.value <= 10) {
    setTimeout(() => {
      tagsAreLoading.value = false
    }, 500)
  }
}

// created
startLoading()

// watch
watch(
  () => 'route.params.currentPage',
  (val) => {
    currentPage.value = Number(val)
  },
)
</script>
