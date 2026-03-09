import Component from "@glimmer/component";
import type { HermesDocument } from "hermes/types/document";
import timeAgo from "hermes/utils/time-ago";

export enum TimeColumn {
  Modified = "modifiedTime",
  Created = "createdTime",
}

interface TableRowComponentSignature {
  Element: HTMLTableRowElement;
  Args: {
    doc: HermesDocument;
    timeColumn: `${TimeColumn}`;
  };
}

export default class TableRowComponent extends Component<TableRowComponentSignature> {
  protected get time() {
    const { modifiedTime, createdTime } = this.args.doc;
    const { timeColumn } = this.args;

    let time = null;

    if (modifiedTime && timeColumn === TimeColumn.Modified) {
      time = modifiedTime;
    } else if (createdTime && timeColumn === TimeColumn.Created) {
      time = createdTime;
    }

    if (time) {
      return timeAgo(time, { limitTo24Hours: true });
    }

    return "Unknown";
  }

  protected get isDraft() {
    if (this.args.doc.isDraft) {
      return true;
    }

    return this.args.doc.status === "WIP";
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Table::Row": typeof TableRowComponent;
  }
}
