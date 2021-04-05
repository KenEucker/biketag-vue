<template>
  <div class="box" v-if="!$auth.loading">
    <div
      style="
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
        align-items: center;
        height: 100%;
        width: 80%;
      "
      v-if="!$auth.isAuthenticated"
    >
      <input type="button" value="Login" @click="login" />
    </div>
    <div
      style="
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
        align-items: center;
        height: 100%;
        width: 80%;
      "
      v-if="$auth.isAuthenticated"
    >
      <input type="button" value="Logout" @click="logout" />
    </div>
  </div>
</template>

<script>
export default {
  name: "AuthButton",
  methods: {
    login() {
      this.$auth.loginWithRedirect();
    },
    logout() {
      this.$auth.logout();
      this.$router.push({ path: "/" });
    },
  },
};
</script>

<style scoped>
.box {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100px;
  padding: 10px;
  margin-right: 10px;
  border: 3px solid navy;
  border-radius: 3px;
}

input[type="button"] {
  outline: none;
  border: none;
  background-color: white;
  color: navy;
  font-family: "Montserrat", Verdana, sans-serif;
  padding: 10px 20px;
  border-radius: 3px;
  transition: 0.1s;
  cursor: pointer;
}

input[type="button"]:hover {
  background-color: #42b883;
  color: white;
}
</style>
