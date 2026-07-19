<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="ambassador-dashboard container">
    <img class="ambassador-icon" src="/images/biketag-ambassador.svg" alt="Ambassador Icon" />
    <h1>BikeTag Ambassador Dashboard</h1>
    <p>Manage your local BikeTag round. Use the tools below to approve, edit, or remove posts.</p>

    <div class="actions">
      <router-link to="/approve" class="action-button">
        <span class="icon">
          <!-- Sketch-style checkmark -->
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 12l6 6L20 6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        Approve Posts in Round
      </router-link>

      <router-link to="/rejections" class="action-button">
        <span class="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9" />
            <line x1="8" y1="8" x2="16" y2="16" />
            <line x1="16" y1="8" x2="8" y2="16" />
          </svg>
        </span>
        Review Rejected Images
      </router-link>

      <router-link to="/delete" class="action-button">
        <span class="icon">
          <!-- Sketch-style trash can -->
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </span>
        Delete Current Post
      </router-link>

      <router-link to="/edit" class="action-button">
        <span class="icon">
          <!-- Sketch-style pencil -->
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </span>
        Edit Current Post
      </router-link>

      <router-link v-if="canLaunchGame" to="/launch" class="action-button">
        <span class="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path
              d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"
            />
            <path
              d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"
            />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
          </svg>
        </span>
        Launch Game
      </router-link>

      <router-link v-if="!canLaunchGame" to="/new" class="action-button">
        <span class="icon">
          <!-- Sketch-style plus sign -->
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" stroke-linecap="round" stroke-linejoin="round" />
            <line x1="5" y1="12" x2="19" y2="12" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        Create New Round
      </router-link>

      <router-link to="/settings" class="action-button">
        <span class="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
            />
          </svg>
        </span>
        Game Settings
      </router-link>

      <router-link v-if="isBikeTagAdmin" to="/queue-fix" class="action-button">
        <span class="icon">
         <svg
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Heart"
        >
          <path
            d="M12 21s-7.5-4.35-9.75-8.7C.45 8.85 2.1 4.5 6.3 4.5c2.4 0 4.05 1.35 5.7 3.3 1.65-1.95 3.3-3.3 5.7-3.3 4.2 0 5.85 4.35 4.05 7.8C19.5 16.65 12 21 12 21Z"
            fill="currentColor"
          />
        </svg>
        </span>
        Queue Fix
      </router-link>
    </div>
  </div>
</template>

<script setup name="DashboardView">
import { useBikeTagStore } from '@/store/index'
import { computed } from 'vue'

const store = useBikeTagStore()
const isBikeTagAdmin = computed(() => store.isBikeTagAdmin)
const canLaunchGame = computed(() => store.canLaunchGame)
</script>

<style scoped lang="scss">
.ambassador-dashboard {
  background-color: #fff;
  color: #000;
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
  font-family: 'Courier New', monospace;

  h1 {
    font-size: 2rem;
    font-weight: bold;
    border-bottom: 2px dashed #000;
    display: inline-block;
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
  }

  p {
    font-size: 1rem;
    margin-bottom: 2rem;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    .action-button {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      border: 2px dashed #000;
      text-decoration: none;
      color: #000;
      font-weight: bold;
      font-size: 1.1rem;
      transition: background-color 0.2s ease-in-out;

      &:hover {
        background-color: #f5f5f5;
      }

      .icon {
        width: 1.5rem;
        height: 1.5rem;
        flex-shrink: 0;

        svg {
          width: 100%;
          height: 100%;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
      }
    }
  }
}
</style>
