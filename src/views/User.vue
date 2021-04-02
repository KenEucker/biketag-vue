<template>
  <div>

    <div v-if="modal === true">
      <div style="display: flex; position: fixed; top: 11vh; right: 10px">
        <i @click="modal = false; imageSource = ''" class="far fa-times-circle fa-2x" style="color:navy;"></i>
      </div>
      <img v-bind:src="imageSource" alt="user img" style="margin-top: 10vh; max-width: 100vw; max-height: 80vh;">
    </div>

    <div v-if="modal === false">
    <div class="body" style="margin-top: 10vh; padding: 0;">

      <div class="top">
        <div style="display: flex; justify-content: center; width: 95vw; margin-bottom: 20px;">
          <div style="display: flex; justify-content: center; align-items: center; flex-direction: column; border: 2px solid white; padding: 5px; margin: 0 20px; border-radius: 4px;">
            <h3>Following</h3>
            <h3>{{userData.following.length}}</h3>
          </div>
          <div style="display: flex; justify-content: center; align-items: center; flex-direction: column; border: 2px solid white; padding: 5px; margin: 0 20px; border-radius: 4px;">
            <h3>Followers</h3>
            <h3>{{userData.followers.length}}</h3>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; justify-content: space-evenly; align-items: center; height: 100%;">
          <h2>{{userData.username}}</h2>
          <img :src="userData.display" alt="user picture" width=100 height=100 style="border-radius:50%; object-fit: cover;" />
          <p style="padding: 5px;">{{userData.bio}}</p>
        </div>
      </div>

      <div class="container" style="margin-top: 10vh;">
        <div v-for="post in posts" :key="post.id" class="card">
          <div>

            <div style="display: flex; background-color: navy; justify-content: space-evenly; padding: 10px;">
              <div style="display: flex; justify-content: flex-start; align-items: center; width:33%;">
                <i v-if="post.likedBy.includes(username)" @click="interact('post/unlike', post._id, null, 'PATCH')" class="fas fa-heart"></i>
                <i v-else @click="interact('post/like', post._id, null, 'PATCH')" class="far fa-heart"></i>
                <p style="color: white; display: inline; margin-left: 10px;">{{post.likedBy.length}}</p>
              </div>
              <div style="display: flex; justify-content: center; align-items: center; width:33%;">
                <img v-bind:src="cloudinaryURL + post.username + '.jpg'" alt="user img" width=25 height=25 style="border-radius: 50%;" />
              </div>
              <div style="display: flex; justify-content: flex-end; align-items: center; width:33%;">
                <i v-if="!userData.followers.includes(username)" @click="interact('user/follow', null, post.username, 'PATCH')" class="fas fa-user-plus"></i>
                <i v-if="userData.followers.includes(username)" @click="interact('user/unfollow', null, post.username, 'PATCH')" class="fas fa-user-minus"></i>
                <i v-if="selectedPost !== post._id" @click="selectedPost = post._id" class="fas fa-ellipsis-v"></i>
                <i v-if="selectedPost === post._id" @click="selectedPost = ''" class="fas fa-ellipsis-v"></i>
              </div>
            </div>

            <div v-if="selectedPost === post._id" style="background-color: navy; color: white; display: flex; justify-content: space-around;">
              <p @click="modal = true; imageSource = post.path" style="cursor: pointer;">Expand</p>
              <p v-if="post.reportedBy.includes(id)" @click="interact('post/report', post._id, null, 'PATCH')" style="cursor: pointer; color: red;">Report</p>
              <p v-if="!post.reportedBy.includes(id)" @click="interact('post/report', post._id, null, 'PATCH')" style="cursor: pointer;">Report</p>
              <p @click="interact('user/block', null, post.username, 'PATCH')" style="cursor: pointer;">Block</p>
            </div>

            <img @dblclick="interact('post/like', post._id, null, 'PATCH')" v-bind:src="post.path" alt="user post" class="picture" />
          </div>
          <div>
            <p style="width:100%; padding: 5px;"><b>{{post.username}} </b>{{post.caption}}</p>
          </div>
        </div>

        <button style="margin-bottom:15px;" id="loadMore" v-if="posts.length >= 5 && morePosts === true" @click="loadMore()">
          Load More
        </button>

      </div>
      </div>

    </div>
  </div>
</template>

<script>

export default {
  name: 'User',
  data() {
    return {
      posts: [],
      from: 0,
      to: 5,
      morePosts: true,
      modal: false,
      imageSource: '',
      cloudinaryURL: process.env.VUE_APP_CLOUDINARY,
      selectedPost: '',
      userData: [],
    };
  },
  mounted() {
    fetch(`${process.env.VUE_APP_SERVER}/post/profile/${this.targetUser}/${this.from}/${this.to}`)
      .then(res => res.json())
      .then((data) => {
        if (data === 'Authentication Failed.') {
          localStorage.clear();
          this.$store.commit('setUser');
        }
        this.posts = data;
      })
      .then(() => {
        fetch(`${process.env.VUE_APP_SERVER}/user/user/${this.targetUser}`)
          .then(res => res.json())
          .then((data) => {
            if (data === 'Authentication Failed.') {
              localStorage.clear();
              this.$store.commit('setUser');
            }
            this.userData = data;
          })
          .catch(err => console.log(err));
      });
  },
  methods: {
    loadMore() {
      this.from += 5;
      this.to += 5;
      fetch(`${process.env.VUE_APP_SERVER}/post/profile/${this.targetUser}/${this.from}/${this.to}`)
        .then(res => res.json())
        .then((data) => {
          if (data === 'Authentication Failed.') {
            localStorage.clear();
            this.$store.commit('setUser');
          } else if (data.length === 0) {
            this.morePosts = false;
          }
          this.posts.push(...data);
        })
        .catch(err => console.log(err));
    },
    interact(action, postId, username, method) {
      fetch(`${process.env.VUE_APP_SERVER}/${action}`, {
        method,
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: postId, username }),
      })
        .then(res => res.json())
        .then((data) => {
          if (data === 'Authentication Failed.') {
            localStorage.clear();
            this.$store.commit('setUser');
          }
          fetch(`${process.env.VUE_APP_SERVER}/post/profile/${this.targetUser}/0/${this.to}`)
            .then(res => res.json())
            .then((data) => { this.posts = data; });
        })
        .then(() => {
          fetch(`${process.env.VUE_APP_SERVER}/user/user/${this.targetUser}`)
            .then(res => res.json())
            .then((data) => {
              if (data === 'Authentication Failed.') {
                localStorage.clear();
                this.$store.commit('setUser');
              }
              this.userData = data;
            })
            .then(() => {
              if (action === 'user/block') {
                this.$router.push('/');
              }
            })
            .catch(err => console.log(err));
        })
        .catch(err => console.log(err));
    },
  },
  computed: {
    targetUser() {
      return this.$store.state.targetUser;
    },
    username() {
      return this.$store.state.username;
    },
    id() {
      return this.$store.state.id;
    },
    token() {
      return this.$store.state.token;
    },
  },
};

</script>

<style scoped>

.top {
  background-color: navy;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 350px;
  width: 100%;
  padding: 20px;
}

.container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

button {
  outline: none;
  border: none;
  background-color: navy;
  color: white;
  font-family: 'Montserrat', Verdana, sans-serif;
  padding: 10px 20px;
}

i {
  color: white;
  padding: 0px 5px;
  cursor: pointer;
}

</style>
