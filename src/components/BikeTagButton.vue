<template>
  <button
    :class="`biketag__button biketag__button--${props.variant}`"
    :style="`background-image: url(${backgroundSrc})`"
  >
    <span v-if="props.text" class="biketag__text">
      <span class="biketag__text--inner">{{ props.text }}</span>
    </span>
    <div v-else class="biketag__button--children biketag__text">
      <slot></slot>
    </div>
  </button>
</template>

<script setup name="BikeTagButton">
import { computed } from 'vue'
import { variants } from '@/common/bikeTagButtonVariants'

// props
const props = defineProps({
  text: {
    type: String,
    default: '',
  },
  variant: {
    type: String,
    default: 'light',
  },
})

// computed
const backgroundSrc = computed(() => {
  switch (props.variant) {
    case 'medium':
      return variants.medium
    case 'medium-orange':
      return variants.medium_orange
    case 'underline-reverse':
    case 'underline':
      return variants.underline
    case 'circle-clean':
      return variants.circle_clean
    case 'circle':
      return variants.circle
    case 'bold':
      return variants.bold
    case 'empty':
      return ''
    case 'light':
    default:
      return variants.light
  }
})
</script>

<style lang="scss" scoped>
@import '../assets/styles/style';

.biketag {
  &__text {
    &--inner {
      background: transparent;
      padding: 1rem;

      @media (min-width: $breakpoint-mobile-sm) {
        font-size: 1rem;
      }

      @media (min-width: $breakpoint-mobile-md) {
        font-size: 1.25rem;
      }

      @media (min-width: $breakpoint-mobile-lg) {
        font-size: 1.5rem;
      }
    }
  }

  &__button {
    background: transparent;
    border: none;
    font-family: $default-font-family;
    font-weight: bold;
    text-transform: uppercase;

    @include background-btn;

    &--underline {
      img {
        margin-top: 80px;
      }

      &-reverse {
        img {
          margin-top: 40px;
          transform: rotate(180deg);
        }
      }
    }

    &--light {
      min-height: 5.9rem;

      @media (min-width: $breakpoint-desktop) {
        min-width: 10rem;
      }

      @media (min-width: $breakpoint-mobile-md) {
        min-height: 8.9rem;
      }

      .biketag__text--inner {
        color: black;
      }
    }

    &--medium,
    &--medium-orange {
      .biketag__text--inner {
        min-height: 6rem;
        margin: 0 auto;
        display: flex;
        justify-content: center;
        align-items: center;
      }
    }

    &--bold {
      line-height: 8rem;

      @media (max-width: $breakpoint-desktop) {
        line-height: 7rem;
      }

      @media (max-width: $breakpoint-tablet) {
        line-height: 6rem;
      }

      @media (max-width: $breakpoint-mobile-lg) {
        line-height: 5rem;
      }

      .biketag__text--inner {
        padding: 0 1.25rem;
        color: white;
      }
    }

    &--children {
      z-index: 1;
      padding: 0 3%;
    }
  }
}
</style>
