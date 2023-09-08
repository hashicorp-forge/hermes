import Route from "@ember/routing/route";
import { HermesDocumentType } from "hermes/types/document-type";

export default class AuthenticatedNewIndexRoute extends Route {
  model() {
    return this.modelFor("authenticated.new") as HermesDocumentType[];
  }
}
