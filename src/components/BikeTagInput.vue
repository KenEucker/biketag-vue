<template>
  <div class="biketag-input" :style="`background-image: url(${backgroundSrc})`">
    <label v-if="label" :class="type === 'checkbox' ? 'checkbox__label' : ''">{{ label }}</label>
    <input
      v-if="type === 'checkbox'"
      :type="type"
      :class="`checkbox__input--${$attrs.modelValue ? 'checked' : 'unchecked'}`"
      :checked="$attrs"
      @click="toggleLabel"
    />
    <b-form-input v-else :disabled="disabled" v-bind="$attrs" :type="type" />
    <span>
      <slot></slot>
    </span>
  </div>
</template>
<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'BikeTagButton',
  props: {
    type: {
      type: String,
      default: 'text',
    },
    label: {
      type: String,
      default: null,
    },
    variant: {
      type: String,
      default: 'svg',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    backgroundSrc() {
      switch (this.variant) {
        case 'checkbox':
          return ''
        default:
          return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMjU3JyBoZWlnaHQ9JzU3JyB2aWV3Qm94PScwIDAgMjU3IDU3JyBmaWxsPSdub25lJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPgo8cGF0aCBkPSdNOTcuMzU4NiA1LjA5ODE1QzEwOS45NjQgNC4zMzcyMiAxMjMuMTQyIDQuNzg4OCAxMzUuMzk0IDQuNzg4OEgxOTQuMjU3QzIwNi41ODUgNC43ODg4IDIxNS44NzggMS40MTAxOSAyMjcuNzc4IDEuNDEwMTlDMjM2LjcwNSAxLjQxMDE5IDI0NS4xMTcgLTEuMDQ3MTMgMjQ3LjQ2NSA2LjA2NzI2QzI0OS44ODggNy4zMDI3NSAyNTEuNDkgOS4xMzM3MyAyNTEuODUzIDExLjc5NjNDMjUyLjIzMyAxNC41ODMxIDI1NiAxNi4yMzY5IDI1NiAxOS4xNzkyQzI1NiAyMS4wODAxIDI1NC4wNTQgMjIuMzg3NCAyNTMuOTI3IDI0LjE4NDVDMjUzLjY0MSAyOC4yMTY5IDI1My45MjcgMzIuMjg2OSAyNTMuOTI3IDM2LjMyMjVDMjUzLjkyNyA0MC4wMzI2IDI1NiA0My4yMTI1IDI1NiA0Ni45NTg5QzI1NiA1Mi40NTYyIDI0OC40OCA1MC45NjMyIDI0MC4yMTkgNTAuOTYzMkgyMzIuNDA5QzIxNi41MzYgNTIuNTgzOSAxOTMuMTUyIDUwLjk2MzIgMTg1Ljk2MyA1MC45NjMyQzE2NS42MzMgNTAuOTYzMiAxNDcuMjkzIDU0LjAwMzEgMTI3LjQ0NiA1NS4yMTc3QzEwMy4xOTIgNTYuNzAyMSA3Ny42NzEgNTUuNDY4IDUzLjI2MjMgNTUuNDY4QzQ0Ljk0MjQgNTUuNDY4IC00LjA1MDYxIDU4Ljg3MTcgMS40MjU5MyA0OC40NjA1QzUuMzg4NzUgNDAuOTI3IDkuMDUzNiAzMy4zMjE5IDEwLjY2MjkgMjUuNTE5MUM5LjM4NzY0IDIyLjA5MDcgNy4xODU1MyAxOS4yNzE2IDcuMTg1NTMgMTUuNDI1MkM3LjE4NTUzIDEyLjI5NzEgMy45NDYzNCAzLjA3NzIzIDEzLjQwNTkgMi41MzYzOUMxNC44NTcxIDIuNDUzNDIgMTYuMjE4MyAyLjQyNzIgMTcuNTE0MyAyLjQ0ODI0QzI0LjQ5MjUgMi41NjE0OSAyOS41ODE5IDQuMDQ0NzEgMzYuNjc0NyA1LjQxNDQ3QzQ1LjQ4MDYgNy4xMTUwOCA1OC4xMjUxIDUuOTgwNjkgNjcuMzE1NyA1LjkxNTAxQzc3LjM2NDYgNS44NDMxOSA4Ny4zNDQ5IDUuNDA2MTUgOTcuMzU4NiA1LjA5ODE1WicgZmlsbD0nd2hpdGUnLz4KPHBhdGggZD0nTTcuMTg1NTMgMTAuNDE5OEMzMC44OSA5LjE5MzYyIDU3Ljg4NDUgMTEuMzEwMyA4MC42Nzc5IDcuMDQxMjFDOTcuODAyNiAzLjgzMzg3IDExNy41NzggNC43ODg4IDEzNS4zOTQgNC43ODg4QzE2MC45NjkgNC43ODg4IDE4Ny44NzQgNi4wNDU1OCAyMTMuMzc5IDQuNzI2MjRDMjI3Ljc3NCAzLjk4MTYgMjUwLjM1NSAwLjgxMDQ0MyAyNTEuODUzIDExLjc5NjNDMjUyLjIzMyAxNC41ODMxIDI1NiAxNi4yMzY5IDI1NiAxOS4xNzkyQzI1NiAyMS4wODAxIDI1NC4wNTQgMjIuMzg3NCAyNTMuOTI3IDI0LjE4NDVDMjUzLjY0MSAyOC4yMTY5IDI1My45MjcgMzIuMjg2OSAyNTMuOTI3IDM2LjMyMjVDMjUzLjkyNyA0MC4wMzI2IDI1NiA0My4yMTI1IDI1NiA0Ni45NTg5QzI1NiA1Mi40NTYyIDI0OC40OCA1MC45NjMyIDI0MC4yMTkgNTAuOTYzMkMxOTYuMSA1MC45NjMyIDE1MS45ODIgNTAuOTYzMiAxMDcuODYzIDUwLjk2MzJDODIuODIyMyA1MC45NjMyIDU5LjM5NTIgNTEuMzkwOCAzNS4wNjIgNTMuMTUzQzIwLjA3OTEgNTQuMjM4MSAxOC4yOTQ5IDQ2LjkwMDEgMTMuNTIxMSA0MC4yMDE3QzEwLjMzMTQgMzUuNzI2MSAxMi4zNTczIDMxLjQ3NyAxMS4xMDIxIDI2Ljg3NDlDOS45OTAxNyAyMi43OTg0IDcuMTg1NTMgMTkuNzY2IDcuMTg1NTMgMTUuNDI1MkM3LjE4NTUzIDEyLjI5NzEgMy45NDYzNCAzLjA3NzIzIDEzLjQwNTkgMi41MzYzOUMyMi42NzEyIDIuMDA2NjUgMjguMjY0NyAzLjc5MDMyIDM2LjY3NDcgNS40MTQ0N0M0NS40ODA2IDcuMTE1MDggNTguMTI1MSA1Ljk4MDY5IDY3LjMxNTcgNS45MTUwMUM4My4wOTYgNS44MDIyMyA5OC43MDcgNC43ODg4IDExNC41NDQgNC43ODg4QzE0MS4xMTUgNC43ODg4IDE2Ny42ODYgNC43ODg4IDE5NC4yNTcgNC43ODg4QzIwNi41ODUgNC43ODg4IDIxNS44NzggMS40MTAxOSAyMjcuNzc4IDEuNDEwMTlDMjM2Ljg3MyAxLjQxMDE5IDI0NS40MzMgLTEuMTQwMjUgMjQ3LjU5MSA2LjQ3ODExQzI0OC45NjIgMTEuMzE3IDI0NS42MzMgMTguMzIwNiAyNDUuNjMzIDIzLjQzMzdDMjQ1LjYzMyAyOC45NTI1IDI0My4wNDMgMzYuMTQzOCAyNDYuNjY5IDQxLjI2NTNDMjU2LjgzMiA1NS42MTczIDE5OC4xNDUgNTAuOTYzMiAxODUuOTYzIDUwLjk2MzJDMTY1LjYzMyA1MC45NjMyIDE0Ny4yOTMgNTQuMDAzMSAxMjcuNDQ2IDU1LjIxNzdDMTAzLjE5MiA1Ni43MDIxIDc3LjY3MSA1NS40NjggNTMuMjYyMyA1NS40NjhDNDQuOTQyNCA1NS40NjggLTQuMDUwNjEgNTguODcxNiAxLjQyNTkzIDQ4LjQ2MDVDNi4xMTk1NSAzOS41Mzc4IDEwLjM5NTIgMzAuNTE0NCAxMS4zMzI0IDIxLjE4MTNDMTIuMDI1MyAxNC4yODI0IDE3LjU1MjggOC41NDQ5NCAxNy41NTI4IDEuNDEwMTknIHN0cm9rZT0nYmxhY2snIHN0cm9rZS13aWR0aD0nMicgc3Ryb2tlLWxpbmVjYXA9J3JvdW5kJy8+Cjwvc3ZnPgo='
      }
    },
  },
  methods: {
    toggleLabel(e) {
      this.$emit('update:modelValue', e.target.checked)
    },
  },
})
</script>
<style lang="scss">
@import '../assets/styles/style';

.biketag-input {
  @include background-btn;

  width: 100%;
  height: 5.5rem;
  position: relative;

  input,
  label {
    position: absolute;
  }

  input {
    border: none;
    top: calc(100% / 3);
    margin-left: 2em;
    width: 80%;
    background-color: transparent;
  }

  label {
    top: calc(100% / 6);
    left: calc(100% / 2.5);
    font-weight: bold;
    font-size: 0.8rem;
  }

  .checkbox {
    &__label {
      font-size: 1rem;
      top: 5px;
      left: 10%;
    }

    &__input {
      &--unchecked,
      &--checked {
        @include background-btn;

        width: 34px;
        height: 34px;
        appearance: none;
        top: unset;
        margin: 0;
      }

      &--unchecked {
        background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDkiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0OSA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCjxyZWN0IHg9IjAuNSIgeT0iNi41IiB3aWR0aD0iMzMiIGhlaWdodD0iMzMiIHN0cm9rZT0iYmxhY2siLz4NCjwvc3ZnPg0KDQo=');
      }

      &--checked {
        background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEiIGhlaWdodD0iNDMiIHZpZXdCb3g9IjAgMCA1MSA0MyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCjxyZWN0IHg9IjAuNSIgeT0iOS41IiB3aWR0aD0iMzMiIGhlaWdodD0iMzMiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS1vcGFjaXR5PSIwLjUiLz4NCjxwYXRoIGQ9Ik0xNy45OTIyIDMyLjY2N0MzMi4wODA0IDI1LjIxNjQgMzkuNzQ4NiAxNS41NjI2IDQ4Ljg3OCAyLjk0NDgyIiBzdHJva2U9ImJsYWNrIi8+DQo8cGF0aCBkPSJNMTguMjI0NyAzMi42NjY5QzE0Ljg3NjUgMjkuNjk3OSA5LjY4MjA0IDIyLjYxODUgNy44NjMyOCAxOC44NzQ4IiBzdHJva2U9ImJsYWNrIi8+DQo8cGF0aCBkPSJNMTcuMTc5NyAzMy40OTk4QzMwLjkxOTggMjQuMjM2MyAzOS43MDU3IDE0LjI2MDIgNDkuNTQwMiAxLjQxMzgyIiBzdHJva2U9ImJsYWNrIi8+DQo8cGF0aCBkPSJNMTcuNDEgMzMuNDk5OUMxNC4wMjQ2IDMwLjIwMjMgOC43NzI1MyAyMi4zMzk1IDYuOTMzNTkgMTguMTgxNCIgc3Ryb2tlPSJibGFjayIvPg0KPHBhdGggZD0iTTE3LjYzNjcgMzMuNDk5OEMzMS4zNzY5IDI0LjIzNjMgNDAuMTYyOCAxNC4yNjAyIDQ5Ljk5NzMgMS40MTM4MiIgc3Ryb2tlPSJibGFjayIvPg0KPHBhdGggZD0iTTE3Ljg3MSAzMy40OTk5QzE0LjQ4NTYgMzAuMjAyMyA5LjIzMzQ3IDIyLjMzOTUgNy4zOTQ1MyAxOC4xODE0IiBzdHJva2U9ImJsYWNrIi8+DQo8cGF0aCBkPSJNMTYuMjQyMiAzMy4wODZDMjkuOTgyMyAyMy44MjI1IDM4Ljc2ODIgMTMuODQ2MyA0OC42MDI3IDEiIHN0cm9rZT0iYmxhY2siLz4NCjxwYXRoIGQ9Ik0xNi40NzY0IDMzLjA4NkMxMy4wOTEgMjkuNzg4NSA3LjgzODk0IDIxLjkyNTcgNiAxNy43Njc2IiBzdHJva2U9ImJsYWNrIi8+DQo8L3N2Zz4NCg==');
      }
    }
  }
}
</style>
<style lang="scss" scoped>
.biketag-input {
  max-width: 25em;
  position: relative;
  margin: 0 auto;
}
</style>
