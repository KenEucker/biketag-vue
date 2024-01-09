<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="container">
    <b-pagination
      v-model="currentPage"
      :total-rows="totalCount"
      :per-page="perPage"
      aria-controls="itemList"
      align="center"
      @page-click="changePage"
    ></b-pagination>
    <div class="player-list">
      <div v-for="player in playersForList" :key="player.name" class="p-lg-3 p-md-2 mb-2">
        <player-bicon size="md" :player="player" />
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
</template>

<script setup name="PlayersView">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBikeTagStore } from '@/store/index'

// components
import PlayerBicon from '@/components/BikeTagPlayer.vue'

// data
const router = useRouter()
const route = useRoute()
const currentPage = ref(route.params?.currentPage.length ? parseInt(route.params?.currentPage) : 1)
const perPage = ref(10)
const store = useBikeTagStore()

// computed
const getPlayers = computed(() => store.getPlayers)
const playersForList = computed(() =>
  getPlayers.value.slice(
    (currentPage.value - 1) * perPage.value,
    currentPage.value * perPage.value,
  ),
)
const totalCount = computed(() => getPlayers.value.length)

// methods
const resetCurrentPage = () => {
  currentPage.value = 1
}
const changePage = (event, pageNumber) => {
  router.push('/players/' + pageNumber)
}

//watch
watch(
  () => 'route.params.currentPage',
  (val) => {
    currentPage.value = Number(val)
  },
)
</script>
