<template>
  <q-page class="flex">
    <!--v-on:login-token="1+1"-->
    <app-you-track></app-you-track>
  </q-page>
</template>

<style scoped>
.flex-column {
  flex-direction: column;
}
</style>

<script>
import AppYouTrack from "components/AppYouTrack.vue";

export default {
  name: "PageIndex",
  components: {
    AppYouTrack
  },
  data() {
    return {};
  },
  methods: {}
};
</script>
