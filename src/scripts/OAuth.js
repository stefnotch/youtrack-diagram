// @ts-check

const {
  AuthorizationRequest,
  AuthorizationNotifier,
  AuthorizationRequestHandler,
  AuthorizationResponse,
  AuthorizationServiceConfiguration,
  RevokeTokenRequest,
  GRANT_TYPE_AUTHORIZATION_CODE,
  GRANT_TYPE_REFRESH_TOKEN,
  TokenRequest,
  BaseTokenRequestHandler
} = require("@openid/appauth");

const {
  NodeCrypto,
  /*NodeBasedHandler,*/
  NodeRequestor
} = require("@openid/appauth/built/node_support/");

import NodeBasedImplicitHandler from "./NodeBasedImplicitHandler.js";

const requestor = new NodeRequestor();

export default class OAuth {
  /**
   *
   * @param {string} openIdConnectUrl
   * @param {string} clientId
   * @param {string} scope
   * @param {number} port
   */
  constructor(openIdConnectUrl, clientId, scope, port) {
    this.openIdConnectUrl = openIdConnectUrl;
    this.clientId = clientId;
    this.scope = scope;
    this.PORT = port;

    /**
     * @type {AuthorizationServiceConfiguration|undefined}
     */
    this.configuration = undefined;

    this.tokenHandler = new BaseTokenRequestHandler(requestor);
    this.notifier = new AuthorizationNotifier();
    this.authorizationHandler = new NodeBasedImplicitHandler(this.PORT);

    this.authorizationHandler.setAuthorizationNotifier(this.notifier);
    this._authorizationCallback = null;
    this.notifier.setAuthorizationListener(async (request, response, err) => {
      console.log(request);
      console.log(response);
      console.log(err);

      this._authorizationCallback(response.code);
      // My OAuth token:
      //response.code

      return;
      if (response) {
        let result = await this.makeRefreshTokenRequest(
          this.configuration,
          request,
          response
        );
        console.log(JSON.stringify(result));
        this.makeAccessTokenRequest(this.configuration, result.refreshToken);
      }
    });
  }

  fetchServiceConfiguration() {
    return AuthorizationServiceConfiguration.fetchFromIssuer(
      this.openIdConnectUrl,
      requestor
    );
  }

  async connect() {
    let configuration = await this.fetchServiceConfiguration();
    this.configuration = configuration;

    return new Promise(resolve => {
      this._authorizationCallback = token => {
        resolve(token);
      };
      this.makeAuthorizationRequest(configuration);
    });
  }

  /**
   *
   * @param {AuthorizationServiceConfiguration} configuration
   */
  makeAuthorizationRequest(configuration) {
    let request = new AuthorizationRequest(
      {
        client_id: this.clientId,
        redirect_uri: `http://127.0.0.1:${this.PORT}`,
        scope: this.scope,
        response_type: AuthorizationRequest.RESPONSE_TYPE_TOKEN,
        state: undefined
      },
      new NodeCrypto()
    );

    this.authorizationHandler.performAuthorizationRequest(
      configuration,
      request
    );
  }

  /**
   *
   * @param {AuthorizationServiceConfiguration} configuration
   * @param {AuthorizationRequest} request
   * @param {AuthorizationResponse} response
   */
  makeRefreshTokenRequest(configuration, request, response) {
    let extras;
    if (request && request.internal) {
      extras = {};
      extras["code_verifier"] = request.internal["code_verifier"];
    }

    let tokenRequest = new TokenRequest({
      client_id: this.clientId,
      redirect_uri: `http://127.0.0.1:${this.PORT}`,
      grant_type: GRANT_TYPE_AUTHORIZATION_CODE,
      code: response.code,
      refresh_token: undefined,
      extras: extras
    });

    return this.tokenHandler.performTokenRequest(configuration, tokenRequest);
  }

  /**
   *
   * @param {AuthorizationServiceConfiguration} configuration
   * @param {string} refreshToken
   */
  makeAccessTokenRequest(configuration, refreshToken) {
    let tokenRequest = new TokenRequest({
      client_id: this.clientId,
      redirect_uri: `http://127.0.0.1:${this.PORT}`,
      grant_type: GRANT_TYPE_REFRESH_TOKEN,
      code: undefined,
      refresh_token: refreshToken,
      extras: undefined
    });

    return this.tokenHandler.performTokenRequest(configuration, tokenRequest);
  }

  /**
   *
   * @param {AuthorizationServiceConfiguration} configuration
   * @param {string} refreshToken
   */
  makeRevokeTokenRequest(configuration, refreshToken) {
    let revokeTokenRequest = new RevokeTokenRequest({ token: refreshToken });

    return this.tokenHandler.performRevokeTokenRequest(
      configuration,
      revokeTokenRequest
    );
  }
}
