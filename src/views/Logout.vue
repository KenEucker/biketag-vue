<!-- eslint-disable vue/multi-word-component-names -->
<script setup name="LogoutView"></script>
<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="container">
    <p class="mt-5 mb-5">
      {{ $t('pages.logout.description') }}
    </p>
    <img class="spinner" src="@/assets/images/SpinningBikeV1.svg" alt="Loading..." />
  </div>
</template>

<style lang="scss" scoped>
@import '../assets/styles/style';

.container {
  img {
    height: 100%;
    max-width: 160px;
  }

  .description {
    background-color: transparent !important;
    font-family: $default-font-family;
    text-transform: uppercase;
  }
}
</style>
