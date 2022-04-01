<template>
  <div class="deck">
    <template v-for="(tag, i) in tags" :key="i">
      <article>
        <img :src="tag.foundImageUrl" />
      </article>
    </template>
  </div>
</template>
<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'BikeDex',
  props: {
    tags: {
      type: Array,
      default: [],
    },
  },
  mounted() {},
  async created() {
    console.log("Ssssssssss", this.$props.tags)
  },
  methods: {
    emitDragend(e) {
      this.$emit('dragend', e)
    },
  },
})
</script>
<style lang="scss" scoped>
.deck {
  margin: 3rem 0;
  width: 200px;
  height: 200px;
  /* position relative for the pseudo element */
  position: relative;
  /* perspective for the nested cards */
  perspective: 1200px;
  filter: drop-shadow(0 0 10px #000);
}

.deck img {
  object-fit: contain;
}

/* with a pseudo element add two rectangles at the bottom of the deck, to create the hinges of the rolodex */
.deck:after {
  content: "";
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
/* absolute position each card to cover the size of the deck */
.deck .card {
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
}
/* absolute position each half of the card to cover the size of the card itself */
.deck .card .card--front,
.deck .card .card--back {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: hsl(0, 0%, 100%);
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
  ); /* 8.25 = (25/ 2) + 4; considering the height of the hinges and the vertical translation*/
}
/* rotate the back of the card */
.deck .card .card--back {
  transform: rotateY(180deg);
  /* include the icon of codepen as a background */
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><g transform="translate(5 5)" fill="none" stroke="%231E1F26" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"><path d="M 45 0 l 45 30 l -45 30 l -45 -30 l 45 -30 v 30 l 45 30 l -45 30 l -45 -30 l 45 -30 m 45 30 v -30 m -45 30 v 30 m -45 -30 v -30"></path></g></svg>'),
    hsl(0, 0%, 100%);
  background-size: 40%;
  background-position: 50% 50%;
  background-repeat: no-repeat;
}
/* when the card is toggled to .active rotate the container */
.deck .card.active {
  transform: translateY(4px) rotateX(-180deg);
}

/* property: value pairs styling the content of the cards */
/* front of the card: display the content in a grid
| svg   |   name         |
| svg   |   @codepen     |
| tag   |   tag          |
*/
.deck .card .card--front {
  display: grid;
  grid-template-columns: 1fr 2fr;
  padding: 1rem;
  justify-items: center;
  align-items: center;
}
.deck .card .card--front > svg {
  width: 110px;
  height: auto;
  display: block;
  grid-row: 1/3;
}
.deck .card .card--front h1 {
  color: #0ebeff;
  text-transform: uppercase;
  font-size: 1.25rem;
  justify-self: start;
  align-self: end;
}
.deck .card .card--front h2 {
  grid-column: 2/3;
  grid-row: 2/3;
  font-size: 0.9rem;
  text-transform: lowercase;
  font-weight: 400;
  letter-spacing: 0.1rem;
  justify-self: start;
  align-self: start;
}
.deck .card .card--front p {
  grid-column: span 2;
  text-align: center;
}

/* style the buttons included on each side of the card */
.deck .card button {
  color: hsl(0, 0%, 100%);
  background: #0ebeff;
  border: none;
  font-family: inherit;
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  padding: 0.75rem;
  box-shadow: 0 0 2px hsla(0, 0%, 0%, 0.2);
  /* hide the buttons by default */
  opacity: 0;
}
.deck .card button svg {
  display: block;
  width: 100%;
  height: 100%;
  background: none;
}
/* smaller button for the back of the card */
.deck .card .card--back button {
  width: 38px;
  height: 38px;
}
/* show the button when hovering the card or focusing on the button */
.deck .card:hover button,
.deck .card button:focus {
  opacity: 1;
}
</style>
