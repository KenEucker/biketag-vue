<template>
  <div id="app">
    <div>
      <div class="header">
        <div id="logo">
          <h1 style="color: #fff">Bike Tag</h1>
        </div>
        <div id="auth">
          <AuthButton />
        </div>
      </div>

      <router-view />

      <div id="nav">
        <router-link to="/"><i class="fas fa-home fa-2x"></i></router-link>
        <router-link to="/explore"
          ><i class="fas fa-search fa-2x"></i
        ></router-link>
        <router-link to="/upload"
          ><i class="fas fa-camera-retro fa-2x"></i
        ></router-link>
        <router-link to="/user">
          <i class="fas fa-user-alt fa-2x"></i>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
import AuthButton from "@/components/AuthButton.vue";

export default {
  components: {
    AuthButton,
  },
  mounted() {
    fetch(`${process.env.VUE_APP_SERVER}/user/self`, {
      headers: { Authorization: `Bearer ${this.token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data === "Authentication Failed.") {
          localStorage.clear();
          this.$store.commit("setUser");
        }
      })
      .catch((err) => console.log(err));
  },
  computed: {
    username() {
      return this.$store.state.username;
    },
    token() {
      return this.$store.state.token;
    },
  },
};
</script>

<style>
* {
  box-sizing: border-box;
  word-break: break-word;
}
body {
  margin: 0;
  color: #666;
}
h1 {
  font-family: "Dancing Script";
  font-size: 2.2em;
  color: navy;
  margin: 0;
}
h2,
h3,
h4,
h5,
h6,
p {
  font-family: "Montserrat", Verdana, sans-serif;
  margin: 0;
  line-height: 1.5;
}

.header {
  background-color: navy;
  height: 11vh;
  width: 100vw;
  display: flex;
  align-items: center;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
}

#logo {
  width: 100vw;
  display: flex;
  justify-content: center;
}

#auth {
  margin-top: 0px;
  justify-content: right;
}

#nav {
  background-color: navy;
  height: 10vh;
  width: 100vw;
  border-top: 5px solid navy;
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  left: 0;
  bottom: 0;
}

#nav a {
  color: #fff;
  margin: 0 30px;
}
#nav a.router-link-exact-active {
  color: #42b883;
}

.body {
  margin-top: 10vh;
  margin-bottom: 10vh;
  padding-top: 10px;
}

.card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-bottom: 50px;
  box-shadow: 0 4px 6px 0 hsla(0, 0%, 0%, 0.2);
  width: 300px;
}

.picture {
  width: 300px;
  max-height: 300px;
  object-fit: cover;
}

@media only screen and (max-width: 500px) {
  .card,
  .picture {
    width: 100%;
    box-shadow: none;
  }
}
</style>
