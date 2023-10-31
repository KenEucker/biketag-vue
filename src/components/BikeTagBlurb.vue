<template>
  <section
    :id="props.title.toLowerCase().replaceAll(' ', '-')"
    :class="`biketag-blurb ${props.variant}`"
  >
    <div class="header">
      <h1>{{ props.title }}</h1>
      <h5>{{ props.subtitle }}</h5>
    </div>
    <hr :style="`background-image: url(${styledHr})`" />
    <div class="container">
      <article class="text-container">
        <slot />
      </article>
      <article class="img-container">
        <img v-if="props.imgSrc" :src="props.imgSrc" />
        <bike-tag-button v-if="props.link" :text="_linkText()" @click="buttonClick" />
      </article>
    </div>
  </section>
</template>

<script setup name="BikeTagBlurb">
import { useRouter } from 'vue-router'
import StyledHr from '@/assets/images/hr.svg'

// componets
import BikeTagButton from '@/components/BikeTagButton'

// props
const props = defineProps({
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
    default: '',
  },
  link: {
    type: String,
    default: null,
  },
  linkText: {
    type: String,
    default: null,
  },
  variant: {
    type: String,
    default: 'center',
  },
})

// data
const styledHr = StyledHr
const router = useRouter()

// methods
function _linkText() {
  return props.linkText ?? props.link
}
function buttonClick() {
  if (props.link.indexOf('://') !== -1) {
    window.location = props.link
  }
  router.push({ path: props.link })
}
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
  h5 {
    height: 100%;
    align-self: center;
  }
}

.center {
  text-align: center;
  align-items: center;
  justify-content: center;

  .header {
    text-align: center;
  }
}

.container {
  .img-container {
    display: flex;
    flex-flow: column nowrap;
    place-content: space-around center;
    align-items: center;

    img {
      width: 50%;
    }
  }

  .text-container {
    padding: 1rem;
    text-align: justify;
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
    flex-flow: row-reverse wrap;
  }

  .header {
    text-align: right;
  }
}

.left {
  .container {
    flex-flow: row wrap;
  }

  .header {
    text-align: left;
  }
}
@media (width >= 600px) {
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
    h5 {
      margin-left: 0.5rem;
    }
  }
}
</style>
