import { inject as service } from "@ember/service";
import Torii from "ember-simple-auth/authenticators/torii";

export default class ToriiAuthenticator extends Torii {
  @service torii;
}
