import Controller from '@ember/controller';
import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import AuthenticatedUserService, {
  AuthenticatedUser,
} from "hermes/services/authenticated-user";


export default class AuthenticatedMyprofileController extends Controller {
  @service declare authenticatedUser: AuthenticatedUserService;

  protected get profile(): AuthenticatedUser {
    return this.authenticatedUser.info;
  }

}


