<template>
  <nav class="navbar navbar-collapse sticky-top navbar-dark bg-primary">
    <div class="container-fluid">
      <button
        ref="togglebtn"
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarSupportedContent"
        aria-controls="navbaredContent"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div id="navbarSupportedContent" ref="navcontent" class="collapse navbar-collapse">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item">
            <router-link class="nav-link" to="/" @click="forceToggle">Home</router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link" to="/archive" @click="forceToggle">Archive</router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link" to="/submittag" @click="forceToggle">Play</router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link" to="/how" @click="forceToggle">How</router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link" to="/about" @click="forceToggle">About</router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link" to="/hint" @click="forceToggle">Hint</router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link" to="/donate" @click="forceToggle">Donate</router-link>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>
<script>
import { defineComponent } from 'vue'
import { RouterLink } from 'vue-router'
export default defineComponent({
  name: 'HeaderNav',
  components: {
    RouterLink,
  },
  methods: {
    forceToggle: function () {
      this.$refs.togglebtn.classList.toggle('collapsed')
      this.$refs.togglebtn.setAttribute('aria-expanded', 'false')
      this.$refs.navcontent.classList.toggle('show')
    },
  },
})
</script>
