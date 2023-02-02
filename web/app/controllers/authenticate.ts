import Controller from "@ember/controller";
import { inject as service } from "@ember/service";
import { action } from "@ember/object";

export default class AuthenticateController extends Controller {
  @service declare session: any;

  protected get currentYear(): number {
    return new Date().getFullYear();
  }

  @action protected authenticate(): void {
    this.session.authenticate("authenticator:torii", "google-oauth2-bearer");

  }
}

declare module "@ember/controller" {
  interface Registry {
    authenticate: AuthenticateController;
  }
}
