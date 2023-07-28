import Controller from "@ember/controller";
import { alias } from "@ember/object/computed";
import { inject as service } from "@ember/service";
import FetchService from "../../services/fetch";

export default class AuthenticatedWaitingForMeController extends Controller {
  @alias("model.docsWaitingForReview") docsWaitingForReview;
  @alias("model.docsReviewed") docsReviewed;

  @service router;
  @service authenticatedUser;
  @service("config") configSvc;
  @service("flash-messages") flashMessages;
  @service("fetch") fetchSvc: FetchService;
}
