<template>
  <div class="body">
    <div class="container">

      <div v-if="!image" style="margin-top:10px;">
        <div style="height: 200px; width: 200px; border: 1px solid black;"></div>
        <h3>Upload an image</h3><br>
        <input type="file" @change="onFileChange">
      </div>

      <div v-else style="margin-top:10px;">
        <img :src="image" style="object-fit: cover;" />
        <button @click="removeImage">Remove</button>
        <br>
        <textarea v-model="caption" placeholder="Caption..." maxlength="200"></textarea>
        <br>
        <button @click="upload()">Submit</button>
      </div>

      <div style="margin-top:10px;"><p>{{response}}</p></div>

    </div>
  </div>
</template>

<script>

export default {
  name: 'Upload',
  data() {
    return {
      image: '',
      caption: '',
      response: '',
    };
  },
  methods: {
    upload() {
      const formData = new FormData();
      formData.append('caption', this.caption);
      formData.append('picture', this.file);
      fetch(`${process.env.VUE_APP_SERVER}/post/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}` },
        body: formData,
      })
        .then(res => res.json())
        .then((data) => {
          if (data === 'Authentication Failed.') {
            localStorage.clear();
            this.$store.commit('setUser');
          } else if (data === 'Picture posted.') {
            this.image = '';
            this.caption = '';
            this.$router.push('/profile');
          } else {
            this.response = 'An error occurred while posting your picture. Please try again.';
          }
        });
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
      this.caption = '';
      this.response = '';
    },
  },
  computed: {
    token() {
      return this.$store.state.token;
    },
  },
};

</script>

<style scoped>

.container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
}

.container > div {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}

img {
  width: 200px;
  height: 200px;
  margin: auto;
  display: block;
  margin-bottom: 10px
}

textarea {
  width: 300px;
  height: 110px;
  padding: 5px;
  outline: none;
  resize: none;
  font-family: 'Montserrat', Verdana, sans-serif;
}

button {
  outline: none;
  border: none;
  background-color: navy;
  color: white;
  font-family: 'Montserrat', Verdana, sans-serif;
  padding: 10px 20px;
}

</style>
