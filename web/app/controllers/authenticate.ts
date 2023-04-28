import Controller from "@ember/controller";
import { inject as service } from "@ember/service";
import SessionService from "hermes/services/session";
import { dropTask } from "ember-concurrency";

export default class AuthenticateController extends Controller {
  @service declare session: SessionService;

  protected get currentYear(): number {
    return new Date().getFullYear();
  }

  protected authenticate = dropTask(async () => {
    await this.session.authenticate(
      "authenticator:torii",
      "google-oauth2-bearer"
    );
  });
}
declare module "@ember/controller" {
  interface Registry {
    authenticate: AuthenticateController;
  }
}
