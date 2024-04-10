import { assert } from "@ember/debug";
import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import DocumentTypesService from "hermes/services/document-types";

export default class AuthenticatedAdminDoctypesDoctypeRoute extends Route {
  @service declare documentTypes: DocumentTypesService;

  model(params: { doctype_id: string }) {
    assert("index must exist", this.documentTypes.index);
    /**
     * TODO: Make this an async model that fetches
     * the doctype from the server if it's not already loaded.
     */
    const doctype = this.documentTypes.index.find(
      (doctype) => doctype.name === params.doctype_id,
    );

    assert("doctype must exist", doctype);

    return doctype;
  }
}
