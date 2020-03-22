<template>
  <div class="flex col">
    <div v-if="youtrack != null" class="flex column nowrap col">
      <div>
        <q-select
          v-model="selectedAgile"
          :options="filteredAgiles"
          :option-value="opt => opt.id"
          :option-label="opt => opt.name && opt.name.replace(/project development$/i, 'PD')"
          filled
          use-input
          hide-selected
          options-dense
          input-debounce="0"
          :label="selectedAgile.name || 'Youtrack Agiles'"
          @filter="filterAgiles"
        ></q-select>
      </div>
      <app-diagram
        class="app-diagram"
        v-bind:youtrack="youtrack"
        v-bind:agile-id="selectedAgile.id"
        v-bind:diagram-mode="diagramMode"
      ></app-diagram>
    </div>
    <div v-else class="text-center col">
      <h6>Not logged in</h6>
    </div>

    <div class="bottom-right">
      <q-btn-toggle
        v-model="diagramMode"
        class="round-toggle"
        no-caps
        rounded
        unelevated
        toggle-color="primary"
        color="white"
        text-color="primary"
        :options="[
          {label: 'Sprint', value: 'sprint'},
          {label: 'Epic', value: 'epic'},
          {label: 'Gantt', value: 'gantt'},
        ]"
      />
    </div>
  </div>
</template>
<style scoped>
.text-center {
  text-align: center;
}
.round-toggle {
  border: 1px solid #027be3;
}
.bottom-right {
  position: fixed;
  bottom: 0px;
  right: 0px;
  margin: 1em;
}
.app-diagram {
  min-height: 0;
  width: 100%;
  flex-grow: 1;
  flex-basis: 0;
  overflow: hidden;
}
</style>

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
      selectedAgile: {},
      agileFilter: "",
      token: "",
      /** @type {"sprint"|"epic"} */
      diagramMode: "sprint"
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
        baseUrl: "http://vm81.htl-leonding.ac.at", //"http://10.191.112.81",
        token: token
      };
      let yt = new Youtrack(config);
      this.youtrack = yt;

      let user = await yt.users.current();

      this.username = user.name;
      EventBus.$emit("youtrack-username", user.name);

      this.agiles = await yt.agiles.all({ $top: -1 });
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
