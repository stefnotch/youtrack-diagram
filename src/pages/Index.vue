<template>
  <q-page class="flex flex-column">
    <!--v-on:login-token="1+1"-->
    <app-you-track></app-you-track>
  </q-page>
</template>

<style>
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
