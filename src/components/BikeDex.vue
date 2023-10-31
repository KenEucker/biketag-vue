<template>
  <div class="deck">
    <template v-for="(tag, i) in props.tags" :key="i">
      <div
        v-if="tag.foundImageUrl"
        :id="`card-${i}`"
        class="deck__card"
        :style="`z-index : -${1 + i}`"
        @click="() => cardClick(i, `card-${i}`)"
      >
        <img class="deck__card--front" :src="tag.foundImageUrl" />
        <div class="deck__card--back">
          <p># {{ tag.tagnumber }}</p>
          <p>{{ new Date(tag.foundTime * 1000).toDateString() }}</p>
          <p>{{ tag.foundLocation }}</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup name="BikeDex">
// props
const props = defineProps({
  tags: {
    type: Array,
    default: () => [],
  },
})

// methods
function cardClick(i, e) {
  const card = document.getElementById(e)
  let zIndex
  if (Array.from(card.classList).includes('deck__card--active')) {
    zIndex = -(1 + i)
  } else {
    zIndex = 1 + i
  }
  card.classList.toggle('deck__card--active')
  const timeoutID = setTimeout(() => {
    card.style.zIndex = zIndex
    clearTimeout(timeoutID)
  }, 500)
}
</script>

<style lang="scss" scoped>
@import '../assets/styles/style';

.deck {
  margin: 3rem 0;
  width: 100%;
  height: 260px;

  /* position relative for the pseudo element */
  position: relative;

  /* perspective for the nested cards */
  perspective: 1200px;
  filter: drop-shadow(0 0 10px #000);

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    height: 25px;
    transform: translate(0, -50%);
    clip-path: polygon(
      35% 0%,
      40% 0%,
      40% 100%,
      35% 100%,
      35% 0%,
      60% 0%,
      65% 0%,
      65% 100%,
      60% 100%,
      60% 0%
    );
    background: linear-gradient(to bottom, #93a9d2, #fff, #93a9d2);

    /* z index to have the pseudo element _behind_ the cards which follow */
    z-index: -5;
  }

  &__card {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;

    /* set up a transition from the bottom of the card */
    transition: transform 1s cubic-bezier(0.445, 0.05, 0.55, 0.95);
    transform-origin: 50% 100%;
    transform-style: preserve-3d;
    transform: translateY(-4px) rotateX(0deg);

    &--front,
    &--back {
      position: absolute;
      border-radius: 5px;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: hsl(0deg 0% 100%);
      backface-visibility: hidden;
      clip-path: polygon(
        0% 100%,
        35% 100%,
        35% calc(100% - 8.25px),
        40% calc(100% - 8.25px),
        40% 100%,
        60% 100%,
        60% calc(100% - 8.25px),
        65% calc(100% - 8.25px),
        65% 100%,
        100% 100%,
        100% 0%,
        0% 0%
      );
    }

    &--back {
      display: flex;
      justify-content: space-around;
      align-items: center;
      flex-flow: column-reverse;
      transform: rotateY(180deg);
      background-size: 40%;
      background-position: 50% 50%;
      background-repeat: no-repeat;

      p {
        transform: rotate(180deg);
        font-family: $default-font-family;
        font-weight: 300;
        line-height: 2rem;
        text-transform: uppercase;
        text-align: center;
      }
    }

    &--front {
      display: grid;
      grid-template-columns: 1fr 2fr;
      padding: 1rem;
      place-items: center center;
    }

    &--active {
      transform: translateY(4px) rotateX(-180deg);
    }
  }

  @media (width >= 576px) {
    height: 330px;
  }

  @media (width >= 770px) {
    height: 400px;
  }
}
@keyframes rotate {
  10%,
  100% {
    transform: rotate(0deg);
  }
}
</style>
