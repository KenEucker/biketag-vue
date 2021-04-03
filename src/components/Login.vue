<template>
  <div class="body">
    <div class="container">

      <div class="header">
        <h1 style="color: #fff;">Bike Tag</h1>
      </div>

      <div class="box" v-if="!$auth.loading">
        <div style="display: flex; flex-direction: column; justify-content: space-evenly; align-items: center; height: 100%; width: 80%;">
          <input type="button" value="Login" @click="login">
        </div>
      </div>

      <div style="margin-top:10px; width: 300px; text-align: center;"><p>{{response}}</p></div>

    </div>
  </div>
</template>

<script>
export default {
  name: 'Login',
  data() {
    return {
      active: 'login',
      username: '',
      password: '',
      response: '',
    };
  },
  methods: {
    login() {
      this.$auth.loginWithRedirect();
    },
  },
};
</script>

<style scoped>

  .container {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    align-items: center;
    height: 100%;
    margin-top: 20px;
  }

  .box {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 300px;
    padding-bottom: 10px;
    border: 3px solid navy;
    margin-top: 10px;
    border-radius: 3px;
  }

  input[type=button] {
    outline: none;
    border: none;
    background-color: navy;
    color: white;
    font-family: 'Montserrat', Verdana, sans-serif;
    padding: 10px 20px;
    border-radius: 3px;
    margin-top: 35px;
    margin-bottom: 10px;
    border-radius: 3px;
    transition: 0.1s;
    cursor: pointer;
  }

input[type=button]:hover {
  background-color: #42b883;
}

  input[type=text], input[type=password] {
    margin: 10px 0;
    padding: 10px;
    outline: none;
    border: none;
    border-bottom: 2px solid #42b883;
  }

  input[type=text] {
    margin-top: 35px;
  }

  input[type=text]:focus, input[type=password]:focus {
    border-bottom: 2px solid navy;
  }

</style>
