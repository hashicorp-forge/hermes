import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import timeAgo from "hermes/utils/time-ago";
import parseDate from "hermes/utils/parse-date";

enum TimeColumn {
  Modified = "modifiedTime",
  Created = "createdTime",
}

interface MyDocsRowComponentSignature {
  Args: {
    doc: HermesDocument;
    timeColumn: `${TimeColumn}`;
  };
}

export default class MyDocsRowComponent extends Component<MyDocsRowComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUserService;

  protected get ownerIsAuthenticatedUser() {
    const docOwner = this.args.doc.owners?.[0];

    if (!docOwner) {
      return false;
    }

    return docOwner === this.authenticatedUser.info.email;
  }

  protected get time() {
    const { modifiedTime, created } = this.args.doc;

    let label = "Unknown";
    console.log(this.args.timeColumn);
    console.log(TimeColumn.Modified);
    console.log(modifiedTime);
    if (this.args.timeColumn === TimeColumn.Modified) {
      if (modifiedTime) {
        label = timeAgo(modifiedTime) as string;
      }
    } else {
      label = parseDate(created) as string;
    }

    return label;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "My::Docs::Row": typeof MyDocsRowComponent;
  }
}
