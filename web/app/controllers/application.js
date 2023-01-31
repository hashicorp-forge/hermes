import Controller from "@ember/controller";
import { inject as service } from "@ember/service";
import config from "../config/environment";

export default class ApplicationController extends Controller {
  @service session;
  config = config.torii.providers["google-oauth2-bearer"];
}
