<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <main class="container worldwide-page">
    <h1>WorldWide</h1>
    <p class="worldwide-page__intro">
      Mystery tags posted across BikeTag games in the last 24 hours.
    </p>

    <p v-if="loading" role="status">Loading recent tags from every city…</p>
    <p v-else-if="!tags.length && failedGames === 0">
      No mystery tags have been posted in the last 24 hours.
    </p>
    <p v-if="failedGames" class="worldwide-page__notice" role="status">
      Recent tags could not be loaded for {{ failedGames }}
      {{ failedGames === 1 ? 'game' : 'games' }}.
    </p>

    <div v-if="tags.length" class="worldwide-page__list">
      <article
        v-for="item in tags"
        :key="`${item.game.slug}-${item.tag.tagnumber}`"
        class="worldwide-page__item"
      >
        <a
          class="worldwide-page__image-link"
          :href="getTagUrl(item.game.slug, item.tag.tagnumber)"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`View ${item.game.name} tag number ${item.tag.tagnumber}`"
        >
          <img
            v-if="item.tag.mysteryImageUrl"
            class="worldwide-page__image"
            :src="item.tag.mysteryImageUrl"
            :alt="`Mystery tag number ${item.tag.tagnumber} from ${item.game.name}`"
            loading="lazy"
          />
          <div v-else class="worldwide-page__image worldwide-page__image--empty">
            Mystery image unavailable
          </div>
        </a>
        <div class="worldwide-page__details">
          <a
            class="worldwide-page__city"
            :href="getGameUrl(item.game.slug)"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ item.game.name }}
          </a>
          <div>Posted by {{ item.tag.mysteryPlayer || 'Unknown player' }}</div>
          <a
            class="worldwide-page__tag-link"
            :href="getTagUrl(item.game.slug, item.tag.tagnumber)"
            target="_blank"
            rel="noopener noreferrer"
          >
            Tag #{{ item.tag.tagnumber }} · View city
          </a>
          <time
            v-if="item.tag.mysteryTime"
            :datetime="new Date(item.tag.mysteryTime * 1000).toISOString()"
          >
            {{ formatPostedTime(item.tag.mysteryTime) }}
          </time>
        </div>
      </article>
    </div>
  </main>
</template>

<script setup name="WorldwideView" lang="ts">
import type { Game, Tag } from '@/common/types'
import { BikeTagEnv } from '@/common/constants'
import { onMounted, ref } from 'vue'
import { useBikeTagStore } from '@/store/index'

type WorldwideTag = { game: Game; tag: Tag }

const store = useBikeTagStore()
const tags = ref<WorldwideTag[]>([])
const loading = ref(true)
const failedGames = ref(0)

const host = (BikeTagEnv.HOST ?? 'biketag.org').replace(/^www\./, '')
const getGameUrl = (slug: string) =>
  BikeTagEnv.CONTEXT === 'dev'
    ? `http://${encodeURIComponent(slug)}.${host}:8080`
    : `https://${encodeURIComponent(slug)}.${host}`
const getRecentEndpoint = (slug: string) =>
  BikeTagEnv.CONTEXT === 'dev'
    ? `http://${encodeURIComponent(slug)}.${host}:7200/.netlify/functions/recent`
    : `${getGameUrl(slug)}/api/recent`
const getTagUrl = (slug: string, tagnumber: number) => `${getGameUrl(slug)}/${tagnumber}`
const formatPostedTime = (timestamp: number) => new Date(timestamp * 1000).toLocaleString()

onMounted(async () => {
  try {
    const gamesLoaded = await store.fetchAllGames(false)
    if (!gamesLoaded) throw new Error('Could not load the BikeTag game list')
    const games = store.getAllGames as Game[]
    const fetchGameTags = async (game: Game) => {
      const response = await fetch(getRecentEndpoint(game.slug), {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error(`Recent tags request failed for ${game.slug}`)
      const recentTags = (await response.json()) as Tag[]
      return recentTags.map((tag) => ({ game, tag }))
    }

    // Keep the requests bounded so a large game list does not flood the API at once.
    for (let index = 0; index < games.length; index += 8) {
      const results = await Promise.allSettled(games.slice(index, index + 8).map(fetchGameTags))
      for (const result of results) {
        if (result.status === 'fulfilled') tags.value.push(...result.value)
        else failedGames.value++
      }
    }

    tags.value.sort((a, b) => b.tag.mysteryTime - a.tag.mysteryTime)
  } catch (error) {
    console.error('Could not load worldwide recent tags', error)
    failedGames.value = Math.max(failedGames.value, 1)
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.worldwide-page {
  max-width: 900px;
  padding-top: 1.5rem;

  h1 {
    text-align: center;
  }

  &__intro {
    margin-bottom: 1.5rem;
    text-align: center;
  }

  &__notice {
    text-align: center;
  }

  &__list {
    display: grid;
    gap: 1.25rem;
  }

  &__item {
    display: grid;
    grid-template-columns: minmax(120px, 240px) 1fr;
    gap: 1rem;
    align-items: center;
    padding: 1rem;
    background: white;
    box-shadow: 0 3px 12px rgb(0 0 0 / 12%);
  }

  &__image-link {
    display: block;
  }

  &__image {
    display: block;
    width: 100%;
    max-height: 180px;
    object-fit: cover;

    &--empty {
      display: grid;
      min-height: 120px;
      place-items: center;
      background: #eef2f4;
      color: #52616b;
      text-align: center;
    }
  }

  &__details {
    display: grid;
    gap: 0.35rem;
  }

  &__city {
    font-size: 1.3rem;
    font-weight: 700;
  }

  &__tag-link {
    font-weight: 600;
  }

  time {
    color: #52616b;
    font-size: 0.9rem;
  }
}

@media (max-width: 520px) {
  .worldwide-page__item {
    grid-template-columns: 1fr;
  }

  .worldwide-page__image {
    max-height: 260px;
  }
}
</style>
