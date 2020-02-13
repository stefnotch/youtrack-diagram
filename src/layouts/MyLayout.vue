<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="glossy">
      <q-toolbar>
        <q-btn flat dense round @click="leftDrawerOpen = !leftDrawerOpen" aria-label="Menu">
          <q-icon name="menu"/>
        </q-btn>

        <q-toolbar-title>Welcome {{username}}</q-toolbar-title>

        <div>
          <app-login v-on:login-token="loginWithToken"></app-login>
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" bordered content-class="bg-grey-2">
      <q-list>
        <q-item-label header>YouTrack Diagram - Version {{version}}</q-item-label>
        <q-item-label header>GitHub</q-item-label>
        <q-item
          clickable
          tag="a"
          target="_blank"
          href="https://github.com/stefnotch/youtrack-diagram"
        >
          <q-item-section avatar>
            <img src="statics/GitHub-Mark-64px.png" width="32">
          </q-item-section>
          <q-item-section>
            <q-item-label>GitHub Repo</q-item-label>
            <q-item-label caption>youtrack-diagram by Stefnotch</q-item-label>
          </q-item-section>
        </q-item>

        <q-item-label header>Settings</q-item-label>
        <q-item>
          <q-item-section>
            <q-item-label>
              <q-select
                v-model="store.oAuthPort"
                :options="store.validOAuthPorts"
                label="OAuth Port"
              />
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view/>
    </q-page-container>
  </q-layout>
</template>

<script>
import { version } from './../../package.json';
import { openURL } from "quasar";
import AppLogin from "components/AppLogin.vue";
import EventBus from "./../scripts/EventBus.js";
import Store from "./../scripts/DataStorage.js";

export default {
  name: "MyLayout",
  components: {
    AppLogin
  },
  data() {
    return {
      leftDrawerOpen: false,
      token: "",
      username: "",
      store: Store,
      version: version
    };
  },
  mounted: function() {
    EventBus.$on("youtrack-username", username => {
      this.username = username;
    });
  },
  methods: {
    openURL,
    /**
     * @param {String} token
     */
    loginWithToken(token) {
      this.token = token;
      EventBus.$emit("login-token", token);
    }
  }
};
</script>

<style>
</style>
