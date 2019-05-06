/*
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the
 * License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Modified by Stefnotch
 */

const EventEmitter = require("events");
const Http = require("http");
const Url = require("url");

const {
  AuthorizationRequest,
  AuthorizationNotifier,
  AuthorizationRequestHandler,
  AuthorizationResponse,
  AuthorizationServiceConfiguration,
  AuthorizationError,
  log,
  BasicQueryStringUtils
} = require("@openid/appauth");

const { NodeCrypto } = require("@openid/appauth/built/node_support/");

const opener = require("opener");

class ServerEventsEmitter extends EventEmitter {}
ServerEventsEmitter.ON_UNABLE_TO_START = "unable_to_start";
ServerEventsEmitter.ON_AUTHORIZATION_RESPONSE = "authorization_response";

export default class NodeBasedImplicitHandler extends AuthorizationRequestHandler {
  constructor(
    // default to port 8000
    httpServerPort = 8000,
    utils = new BasicQueryStringUtils(),
    crypto = new NodeCrypto()
  ) {
    super(utils, crypto);
    // the handle to the current authorization request
    /** @type {Promise<any>} */
    this.authorizationPromise = null;
    this.httpServerPort = httpServerPort;
  }

  /**
   *
   * @param {AuthorizationServiceConfiguration} configuration
   * @param {AuthorizationRequest} request
   */
  performAuthorizationRequest(configuration, request) {
    // use opener to launch a web browser and start the authorization flow.
    // start a web server to handle the authorization response.
    const emitter = new ServerEventsEmitter();

    let firstRequestHandled = false;

    /**
     *
     * @param {Http.IncomingMessage} httpRequest
     * @param {Http.ServerResponse} response
     */
    let firstRequestHandler = (httpRequest, response) => {
      firstRequestHandled = true;
      console.log(httpRequest.url);
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(
        `<!DOCTYPE html>
        <head>
          <meta content="text/html;charset=utf-8" http-equiv="Content-Type">
          <meta content="utf-8" http-equiv="encoding">
          <script>
            let url =  new URL("${request.redirectUri}");
            url.searchParams.append('code', document.URL.match("#access_token=([^&]+)")[1].replace(/[+]/g, "%20"));
            fetch(url).then((res) => { headerElement.innerText = "You can close this window." });
          </script>
        </head>
        <h1 id="headerElement">Sending token to Electron...</h1>`,
        "utf-8",
        () => {}
      );
    };

    /**
     *
     * @param {Http.IncomingMessage} httpRequest
     * @param {Http.ServerResponse} response
     */
    const requestHandler = (httpRequest, response) => {
      if (!httpRequest.url) {
        return;
      }
      if (!firstRequestHandled) {
        return firstRequestHandler(httpRequest, response);
      }

      const url = Url.parse(httpRequest.url);
      const searchParams = new Url.URLSearchParams(url.query || "");

      const state = searchParams.get("state") || undefined;
      const code = searchParams.get("code");
      const error = searchParams.get("error");

      if (!state && !code && !error) {
        // ignore irrelevant requests (e.g. favicon.ico)
        return;
      }

      log("Handling Authorization Request ", searchParams, state, code, error);
      let authorizationResponse = null;
      let authorizationError = null;
      if (error) {
        log("error");
        // get additional optional info.
        const errorUri = searchParams.get("error_uri") || undefined;
        const errorDescription =
          searchParams.get("error_description") || undefined;
        authorizationError = new AuthorizationError({
          error: error,
          error_description: errorDescription,
          error_uri: errorUri,
          state: state
        });
      } else {
        let token = decodeURIComponent(code);
        //token = token.replace("+0-0-0-0-0", " 0-0-0-0-0"); // WTH, but why!
        authorizationResponse = new AuthorizationResponse({
          code: token,
          state: state
        });
      }
      const completeResponse = {
        request,
        response: authorizationResponse,
        error: authorizationError
      };
      emitter.emit(
        ServerEventsEmitter.ON_AUTHORIZATION_RESPONSE,
        completeResponse
      );
      response.end("Close your browser to continue");
    };

    /**
     * @type {Http.Server}
     */
    let server;
    this.authorizationPromise = new Promise((resolve, reject) => {
      emitter.once(ServerEventsEmitter.ON_UNABLE_TO_START, () => {
        reject(`Unable to create HTTP server at port ${this.httpServerPort}`);
      });
      emitter.once(ServerEventsEmitter.ON_AUTHORIZATION_RESPONSE, result => {
        server.close();
        // resolve pending promise
        resolve(result);
        // complete authorization flow
        this.completeAuthorizationRequestIfPossible();
      });
    });

    request
      .setupCodeVerifier()
      .then(() => {
        server = Http.createServer(requestHandler);
        server.listen(this.httpServerPort);
        const url = this.buildRequestUrl(configuration, request);
        log("Making a request to ", request, url);
        opener(url);
      })
      .catch(error => {
        log("Something bad happened ", error);
        emitter.emit(ServerEventsEmitter.ON_UNABLE_TO_START);
      });
  }

  completeAuthorizationRequest() {
    if (!this.authorizationPromise) {
      return Promise.reject(
        "No pending authorization request. Call performAuthorizationRequest() ?"
      );
    }

    return this.authorizationPromise;
  }
}
