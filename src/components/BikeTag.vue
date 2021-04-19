import Card from 'primevue/card';

<template>
    <Card>
        <template #header>
            <img alt="portland-tag-1" src="">
        </template>
        <template #title>
            Portland Bike Tag #1
        </template>
        <template #content>
            found at this one location
        </template>
    </Card>
</template>
  
<script lang="ts">
    import Card from 'primevue/card';
    import { ref, defineComponent } from "vue";
    export default defineComponent({
        name: "BikeTag",
        components: {
            Card,
        },
    });
</script>

<style lang="scss" scoped>
p {
    line-height: 1.5;
    margin: 0;
}
</style>
  