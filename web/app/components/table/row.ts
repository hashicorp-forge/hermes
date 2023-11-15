import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import parseDate from "hermes/utils/parse-date";
import timeAgo from "hermes/utils/time-ago";

enum TimeColumn {
  Modified = "modifiedTime",
  Created = "createdTime",
}

interface TableRowComponentSignature {
  Args: {
    doc: HermesDocument;
    timeColumn: `${TimeColumn}`;
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
    const { modifiedTime, createdTime } = this.args.doc;
    const { timeColumn } = this.args;

    let time = null;

    if (modifiedTime && timeColumn === TimeColumn.Modified) {
      time = modifiedTime;
    }

    if (createdTime && timeColumn === TimeColumn.Created) {
      time = createdTime;
    }

    if (time) {
      return timeAgo(time, { limitTo24Hours: true });
    }

    return "Unknown";
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Table::Row": typeof TableRowComponent;
  }
}
