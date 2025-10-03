// TEMPORARILY DISABLED FOR EMBER 6.x UPGRADE
// import GoogleOauth2BearerV2 from "torii/providers/google-oauth2-bearer-v2";

export default class GoogleToriiProvider {
  redirectUri = window.location.origin + "/torii/redirect.html";

  fetch(data) {
    return data;
  }
}
