import GoogleOauth2BearerV2 from "torii/providers/google-oauth2-bearer-v2";

export default class GoogleToriiProvider extends GoogleOauth2BearerV2 {
  redirectUri = window.location.origin + "/torii/redirect.html";

  fetch(data) {
    return data;
  }
}
