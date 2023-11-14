import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import parseDate from "hermes/utils/parse-date";

interface TableRowComponentSignature {
  Args: {
    doc: HermesDocument;
  };
}

export default class TableRowComponent extends Component<TableRowComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUserService;

  protected get ownerIsAuthenticatedUser() {
    const docOwner = this.args.doc.owners?.[0];

    if (!docOwner) {
      return false;
    }

    return docOwner === this.authenticatedUser.info.email;
  }

  protected get time() {
    const { created } = this.args.doc;
    return parseDate(created) as string;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Table::Row": typeof TableRowComponent;
  }
}
