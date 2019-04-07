<template>
  <div>
    <div v-if="youtrack != null">
      <div>
        <q-select
          v-model="selectedAgile"
          :options="filteredAgiles"
          :option-value="opt => opt.id"
          :option-label="opt => opt.name && opt.name.replace(/project development$/i, 'PD')"
          filled
          use-input
          options-dense
          input-debounce="0"
          label="YouTrack Agiles"
          @filter="filterAgiles"
        ></q-select>
      </div>
      <app-diagram v-bind:youtrack="youtrack" v-bind:agile-id="selectedAgile.id"></app-diagram>
    </div>
    <div v-else>Not logged in</div>
  </div>
</template>

<script>
import { Youtrack, ReducedAgile } from "youtrack-rest-client";
import AppDiagram from "./AppDiagram.vue";
import EventBus from "./../scripts/EventBus.js";

export default {
  name: "app-you-track",
  components: {
    AppDiagram
  },
  data() {
    return {
      /**@type {Youtrack} */
      youtrack: null,
      username: "",
      /** @type {ReducedAgile[]} */
      agiles: [],
      /** @type {ReducedAgile} */
      selectedAgile: "",
      agileFilter: "",
      token: ""
    };
  },
  computed: {
    filteredAgiles() {
      return this.agiles.filter(a =>
        a.name.toLowerCase().includes(this.agileFilter)
      );
    }
  },
  mounted: function() {
    if (this.token) {
      this.connect(this.token);
    }
    EventBus.$on("login-token", token => {
      this.token = token;
      this.connect(this.token);
    });
  },
  methods: {
    /**
     * @param {String} token
     */
    async connect(token) {
      if (!token) return;

      console.log("Connect Method Called!");

      console.log(token);
      const config = {
        baseUrl: "http://vm81.htl-leonding.ac.at:8080", //"http://10.191.112.81:8080",
        token: token
      };
      let yt = new Youtrack(config);
      this.youtrack = yt;

      let user = await yt.users.current();

      this.username = user.name;
      EventBus.$emit("youtrack-username", user.name);

      this.agiles = await yt.agiles.all();
    },
    /**
     * @param {String} val
     * @param {any} update
     */
    filterAgiles(val, update) {
      update(() => {
        this.agileFilter = val;
      });
    }
  }
};
</script>

<style>
</style>
