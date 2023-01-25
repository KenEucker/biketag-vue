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
        <player size="md" :player="player" />
      </div>
    </div>
    <b-form-group>
      <select v-model="perPage" class="form-select w-25 m-auto" @change="resetCurrentPage">
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
<script>
import { ref, computed, watch } from 'vue'
import { useStore } from '@/store/index.ts'
import Player from '@/components/PlayerBicon.vue'

export default {
  name: 'PlayersView',
  components: {
    Player,
  },
  setup() {
    const currentPage = ref(
      this.$route.params?.currentPage.length ? parseInt(this.$route.params?.currentPage) : 1
    )
    let perPage = ref(10)
    const store = useStore()

    // computed
    const getPlayers = computed(() => store.getPlayers)
    const playersForList = computed(() =>
      getPlayers.value.slice(
        (currentPage.value - 1) * perPage.value,
        currentPage.value * perPage.value
      )
    )
    const totalCount = () => getPlayers.value.length

    // methods
    function resetCurrentPage() {
      currentPage.value = 1
    }
    function changePage(event, pageNumber) {
      this.$router.push('/players/' + pageNumber)
    }

    //watch
    watch(
      () => '$route.params.currentPage',
      (val) => {
        currentPage.value = Number(val)
      }
    )

    return {
      currentPage,
      perPage,
      playersForList,
      totalCount,
      resetCurrentPage,
      changePage,
    }
  },
}
</script>
