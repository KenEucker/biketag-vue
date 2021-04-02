<template>
  <div class="body">
    <div class="container">

      <div class="header">
        <h1 style="color: #fff;">Bike Tag</h1>
      </div>

      <div class="box" v-if="active === 'login'">
        <div style="display: flex; justify-content: space-around; align-items: center; text-align: center; width: 100%; border-bottom: 3px solid navy;">
          <h3 @click="active = 'login'" style="width:100%; cursor: pointer; background-color: navy; color: white; padding: 2px;">Login</h3>
          <h3 @click="active = 'register'; response = 'Usernames must be 6-16 characters and contain only lowercase letters, numbers, hyphens, and underscores.'" style="width:100%; cursor: pointer; padding: 2px;">Register</h3>
        </div>
        <div style="display: flex; flex-direction: column; justify-content: space-evenly; align-items: center; height: 100%; width: 80%;">
          <input v-model="username" type="text" placeholder="Username" />
          <input v-model="password" type="password" placeholder="Password" />
          <input type="button" value="Submit" @click="testLogin()">
        </div>
      </div>

      <div class="box" v-if="active === 'register'">
        <div style="display: flex; justify-content: space-around; align-items: center; text-align: center; width: 100%; border-bottom: 3px solid navy;">
          <h3 @click="active = 'login'; response=''" style="width:100%; cursor: pointer; padding: 2px;">Login</h3>
          <h3 @click="active = 'register'" style="width:100%; cursor: pointer; background-color: navy; color: white; padding: 2px;">Register</h3>
        </div>
        <div style="display: flex; flex-direction: column; justify-content: space-evenly; align-items: center; height: 100%; width: 80%;">
          <input v-model="username" type="text" placeholder="Username" />
          <input v-model="password" type="password" placeholder="Password" />
          <input type="button" value="Submit" @click="register()">
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
    testLogin() {
            localStorage.setItem('username', this.username);
            this.$store.commit('setUser');
            this.username = '';
            this.password = '';
    },
    login() {
      fetch(`${process.env.VUE_APP_SERVER}/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: this.username, password: this.password }),
      })
        .then(res => res.json())
        .then((data) => {
          if (data.message === 'Login successful.') {
            this.username = '';
            this.password = '';
            localStorage.setItem('username', data.username);
            localStorage.setItem('id', data.id);
            localStorage.setItem('token', data.token);
            this.$store.commit('setUser');
          } else {
            this.response = 'Login failed.';
          }
        })
        .catch(err => this.response = 'Login failed.');
    },
    register() {
      fetch(`${process.env.VUE_APP_SERVER}/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: this.username, password: this.password }),
      })
        .then(res => res.json())
        .then((data) => {
          if (data === 'User created.') {
            this.active = 'login';
            this.response = `${data} Please log in.`;
          } else {
            this.response = 'Registration failed. Please try again. Usernames must 6-16 characters and contain only lowercase letters, numbers, hyphens, and underscores.';
          }
        })
        .catch(err => this.response = err);
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
