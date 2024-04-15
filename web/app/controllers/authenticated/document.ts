import Controller from "@ember/controller";
import { tracked } from "@glimmer/tracking";
import AuthenticatedDocumentRoute from "hermes/routes/authenticated/document";
import { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedDocumentController extends Controller {
  declare model: ModelFrom<AuthenticatedDocumentRoute>;

  queryParams = ["draft"];
  draft = false;

  /**
   * Whether the model is loading a new document from another one,
   * as is when loading a related Hermes document.
   * Used conditionally by the document `afterModel` to toggle
   * sidebar visibility, resetting its local state to reflect
   * the new model data.
   */
  @tracked modelIsChanging = false;
}

declare module "@ember/controller" {
  interface Registry {
    "authenticated.document": AuthenticatedDocumentController;
  }
}
