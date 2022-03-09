<template>
  <section :id="title.toLowerCase().replaceAll(' ', '-')" :class="`biketag-blurb ${variant}`">
    <div class="header">
      <h1>{{ title }}</h1>
      <h5>{{ subtitle }}</h5>
    </div>
    <hr :style="`background-image: url(${styledHr})`" />
    <div class="container">
      <article class="text-container">
        <slot />
      </article>
      <article class="img-container">
        <img :src="imgSrc" />
        <bike-tag-button
          v-if="link"
          :text="link.replace('/', '').toUpperCase()"
          @click="pushLink"
        />
      </article>
    </div>
  </section>
</template>
<script>
import { defineComponent } from 'vue'
import BikeTagButton from '@/components/BikeTagButton'
import StyledHr from '@/assets/images/hr.svg'

export default defineComponent({
  name: 'BikeTagBlurb',
  components: {
    BikeTagButton,
  },
  props: {
    title: {
      type: String,
      required: true,
    },
    subtitle: {
      type: String,
      default: '',
    },
    imgSrc: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      default: null,
    },
    variant: {
      type: String,
      default: 'right',
    },
  },
  data() {
    return {
      styledHr: StyledHr,
    }
  },
  methods: {
    pushLink() {
      this.$router.push({ path: this.link })
    },
  },
})
</script>
<style lang="scss" scoped>
hr,
.header {
  width: 90%;
  margin: 1rem auto;
}

hr {
  height: 13px;
  background-color: transparent;
  background-repeat: no-repeat;
  background-position: center;
  background-size: 100%;
}

.header {
  text-align: left;
  display: flex;
  flex-flow: row wrap;

  h5 {
    height: 100%;
    align-self: center;
  }
}

.container {
  .img-container {
    display: flex;
    flex-flow: column nowrap;
    justify-content: center;
    align-content: space-around;
    align-items: center;

    img {
      width: 50%;
    }
  }

  .right,
  .left {
    .container {
      display: flex;
      justify-content: space-around;
      align-items: center;
    }
  }

  .right {
    .container {
      flex-flow: row wrap;
    }
  }

  .left {
    .container {
      flex-flow: row-reverse wrap;
    }
  }

  .text-container {
    padding: 1rem;
    text-align: justify;
  }
}
@media (min-width: 600px) {
  hr,
  .header {
    width: 80%;
    margin: 1rem auto;
  }

  .right,
  .left {
    .container {
      flex-wrap: nowrap;

      .img-container {
        width: calc(50vw - 50px);
      }

      .text-container {
        width: calc(50vw);
        text-align: center;
      }
    }
  }

  .header {
    flex-wrap: nowrap;

    h5 {
      margin-left: 1rem;
    }
  }
}
@media (min-width: 1077px) {
  .header {
    h5 {
      align-self: end;
    }
  }
}
</style>
