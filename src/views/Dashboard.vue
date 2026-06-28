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
      
      <router-link to="/new" class="action-button">
        <span class="icon">
          <!-- Sketch-style plus sign -->
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" stroke-linecap="round" stroke-linejoin="round" />
            <line x1="5" y1="12" x2="19" y2="12" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        Create New Round
      </router-link>

      <router-link v-if="isBikeTagAdmin" to="/admin" class="action-button">
        <span class="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 16.8 5.7 21.1 8 14 2 9.4h7.6z" />
          </svg>
        </span>
        Fix Queue Images
      </router-link>
    </div>
  </div>
</template>

<script setup name="DashboardView">
import { useBikeTagStore } from '@/store/index'
import { computed } from 'vue'

const store = useBikeTagStore()
const isBikeTagAdmin = computed(() => store.isBikeTagAdmin)
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
