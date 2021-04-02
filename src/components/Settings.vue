<template>
  <div class="body" style="padding:0">
    <div class="container">

      <div v-if="!settings">

        <div class="settingsButtons">
          <i v-if="!edit" @click="edit = true" class="fas fa-edit fa-2x" style="margin: 0 7px;"></i>
          <i v-if="edit" @click="edit = false" class="far fa-times-circle fa-2x"></i>
          <i v-if="!edit" @click="settings = true" class="fas fa-cog fa-2x" style="margin: 0 7px;"></i>
          <i v-if="!edit" @click="logout()" class="fas fa-sign-out-alt fa-2x" style="margin: 0 7px;"></i>
        </div>

        <div style="display: flex; justify-content: center; width: 95vw; margin-bottom: 20px;">
          <div style="display: flex; justify-content: center; align-items: center; flex-direction: column; padding: 0 5px; margin: 0 20px;">
            <h3>Followers</h3>
            <h3>{{userData.followers.length}}</h3>
          </div>
          <div style="display: flex; justify-content: center; align-items: center; flex-direction: column; padding: 0 5px; margin: 0 20px;">
            <h3>Following</h3>
            <h3>{{userData.following.length}}</h3>
          </div>
        </div>

        <div v-if="!edit" style="display: flex; flex-direction: column; justify-content: center; align-items: center;">
          <h2>{{userData.username}}</h2>
          <img :src="userData.display" alt="user picture" width=100 height=100 style="border-radius:50%; object-fit: cover;" />
          <p style="padding: 5px;">{{userData.bio}}</p>
        </div>

        <div v-if="edit" style="display: flex; flex-direction: column; justify-content: space-evenly; align-items: center; height: 100%;">
          <h2>{{userData.username}}</h2>

          <div v-if="!image" stlye="display: flex; flex-direction: column; justify-content: center; align-items: center;">
            <div style="text-align: center; margin: 8px 0;"><img :src="userData.display" alt="user picture" width=100 height=100 style="border-radius:50%; object-fit: cover;" /></div>
            <div><input type="file" @change="onFileChange"></div>
          </div>
          <div v-else style="display: flex; flex-direction: column; justify-content: center; align-items: center;">
            <div><img :src="image" width=100 height=100 style="border-radius:50%; object-fit: cover;" /></div>
            <div><input type="file" @change="onFileChange"></div>
          </div>

          <input v-model="newBio" style="margin: 10px 0;" maxlength="200" />
          <button @click="update()">Update</button>
        </div>

      </div>

      <div v-if="settings" style="height: 100%;">

        <div style="display: flex; position: absolute; top: 11vh; right: 10px">
          <i @click="settings = false" class="far fa-times-circle fa-2x"></i>
        </div>

        <div style="display: flex; flex-direction: column; justify-content: space-around; align-items: center; height: 100%;">

          <div style="height: 100px; overflow-y: auto; padding: 0 15px;">
            <p>Users you have blocked will appear here.</p>
            <div v-for="user in userData.blocked" :key="user.id">
              <p style="display:inline;"><b>{{user}}</b> - </p>
              <p style="display:inline; cursor: pointer;" @click="unblock(user)">Unblock</p>
            </div>
          </div>

          <div>
            <button @click="deleteAccount()">Delete Account</button>
          </div>

        </div>

      </div>

    </div>
  </div>
</template>

<script>
export default {
  name: 'Settings',
  data() {
    return {
      settings: false,
      edit: false,
      userData: [],
      newBio: '',
      image: '',
    };
  },
  mounted() {
    fetch(`${process.env.VUE_APP_SERVER}/user/self/`, {
      headers: { Authorization: `Bearer ${this.token}` },
    })
      .then(res => res.json())
      .then((data) => {
        this.userData = data;
        this.newBio = data.bio;
      })
      .catch(err => console.log(err));
  },
  methods: {
    logout() {
      localStorage.clear();
      this.$store.commit('setUser');
    },
    update() {
      const formData = new FormData();
      formData.append('bio', this.newBio);
      formData.append('display', this.file);
      fetch(`${process.env.VUE_APP_SERVER}/user/update`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${this.token}` },
        body: formData,
      })
        .then(() => {
          fetch(`${process.env.VUE_APP_SERVER}/user/self/`, {
            headers: { Authorization: `Bearer ${this.token}` },
          })
            .then(res => res.json())
            .then((data) => {
              this.userData = data;
              this.newBio = data.bio;
              this.edit = false;
              this.image = '';
            })
            .catch(err => console.log(err));
        })
        .catch(err => console.log(err));
    },
    onFileChange(e) {
      const files = e.target.files || e.dataTransfer.files;
      if (!files.length) { return; }
      this.createImage(files[0]);
    },
    createImage(file) {
      const image = new Image();
      const reader = new FileReader();
      const vm = this;
      reader.onload = (e) => { vm.image = e.target.result; };
      reader.readAsDataURL(file);
      this.file = file;
    },
    removeImage(e) {
      this.image = '';
    },
    unblock(user) {
      fetch(`${process.env.VUE_APP_SERVER}/user/unblock`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user }),
      })
        .then(res => res.json())
        .then(() => {
          fetch(`${process.env.VUE_APP_SERVER}/user/self/`, {
            headers: { Authorization: `Bearer ${this.token}` },
          })
            .then(res => res.json())
            .then((data) => {
              this.userData = data;
              this.newBio = data.bio;
            }).catch(err => console.log(err));
        }).catch(err => console.log(err));
    },
    deleteAccount() {
      fetch(`${process.env.VUE_APP_SERVER}/user/delete`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.token}` },
      })
        .then(res => res.json())
        .then((data) => {
          if (data === 'User deleted.') {
            localStorage.clear();
            this.$store.commit('setUser');
          }
        })
        .catch(err => console.log(err));
    },
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

<style scoped>

.container {
  background-color: navy;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 20px 0;
}

button, input[type=button] {
  outline: none;
  border: none;
  background-color: white;
  color: navy;
  font-family: 'Montserrat', Verdana, sans-serif;
  padding: 10px 20px;
  border-radius: 3px;
  transition: 0.1s;
  cursor: pointer;
}

button:hover, input[type=button]:hover {
  background-color: #42b883;
}

i {
  color: white;
  padding: 0px 5px;
  cursor: pointer;
}

.settingsButtons {
  display: flex;
  position: absolute;
  top: 11vh;
  right: 10px;
  z-index: 1;
}

@media only screen and (max-width: 850px) {
    .settingsButtons {
      position: static;
      justify-content: center;
      padding: 5px 0 35px 0;
    }
}

</style>
