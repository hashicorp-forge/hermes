import Controller from "@ember/controller";
import { inject as service } from "@ember/service";
import SessionService from "hermes/services/session";
import { dropTask } from "ember-concurrency";
import config from "hermes/config/environment";

export default class AuthenticateController extends Controller {
  @service declare session: SessionService;

  protected get currentYear(): number {
    return new Date().getFullYear();
  }

  protected authenticate = dropTask(async () => {
    console.log('Authenticate button clicked');
    console.log('Config:', JSON.stringify(config.microsoft));
    
    if (config.microsoft && config.microsoft.clientId) {
      console.log('Using Microsoft authentication');
      
      // Direct window location change - simpler approach
      window.location.href = 'https://login.microsoftonline.com/' + 
        config.microsoft.tenantId + 
        '/oauth2/v2.0/authorize' +
        '?client_id=' + config.microsoft.clientId +
        '&response_type=code' +
        '&redirect_uri=' + encodeURIComponent(config.microsoft.redirectUri) +
        '&scope=' + encodeURIComponent('openid profile email User.Read') +
        '&response_mode=query' +
        '&state=' + Date.now();
    } else {
      console.log('Falling back to Google authentication');
      try {
        await this.session.authenticate(
          "authenticator:torii",
          "google-oauth2-bearer"
        );
      } catch (error) {
        console.error('Google authentication failed:', error);
      }
    }
  });
}
declare module "@ember/controller" {
  interface Registry {
    authenticate: AuthenticateController;
  }
}
