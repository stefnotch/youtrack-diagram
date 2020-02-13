<template>
  <div>
    <span>{{ title }}</span>
    <span>&nbsp;&nbsp;</span>
    <q-btn
      glossy
      @click="connect()"
      :disabled="isConnecting"
      :color="token ? 'secondary' : 'negative'"
      >Login</q-btn
    >
  </div>
</template>

<script>
import OAuth from "./../scripts/OAuth.js";
import Store from "./../scripts/DataStorage.js";

/**@type {OAuth} */
let authenticator;

export default {
  name: "app-login",
  data() {
    return {
      title: "Login",
      isConnecting: false,
      token: ""
    };
  },
  mounted: function() {
    if (this.token) {
      this.$emit("login-token", token);
    }
  },
  methods: {
    async connect() {
      this.isConnecting = true;
      this.title = "Loading...";
      if (!authenticator || authenticator.PORT != Store.oAuthPort) {
        console.log(Store.oAuthPort);
        authenticator = new OAuth(
          `http://vm81.htl-leonding.ac.at/hub`,
          `292dc221-6efa-4519-9de3-59cc86988286`,
          `292dc221-6efa-4519-9de3-59cc86988286 Upsource TeamCity YouTrack%20Slack%20Integration 0-0-0-0-0`,
          Store.oAuthPort
        );
      }
      let token;
      try {
        token = await authenticator.connect();
      } catch (e) {
        console.error(e);
        this.isConnecting = false;
        return;
      }
      this.isConnecting = false;
      this.title = "Logged In";

      this.token = token;
      this.$emit("login-token", token);
    }
  }
};
</script>
