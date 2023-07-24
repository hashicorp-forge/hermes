import Controller from "@ember/controller";
import { alias } from "@ember/object/computed";
import { inject as service } from "@ember/service";
import {tracked} from "@glimmer/tracking";
import {action} from "@ember/object";
import {task, timeout} from "ember-concurrency";
import Ember from "ember";
import {TaskForAsyncTaskFunction} from "ember-concurrency";
import FetchService from "../../services/fetch";
import { HermesUser } from "hermes/types/document";

const AWAIT_DOC_DELAY = Ember.testing ? 0 : 1000;

export default class AuthenticatedWaitingForMeController extends Controller {
  @alias("model.docsWaitingForReview") docsWaitingForReview;
  @alias("model.docsReviewed") docsReviewed;

  @service router;
  @service authenticatedUser;
  @service("config") configSvc;
  @service("recently-viewed-docs") recentDocs;
  @service('flash-messages') flashMessages;
  @service("fetch") fetchSvc: FetchService;
}