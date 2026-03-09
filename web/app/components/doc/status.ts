import { dasherize } from "@ember/string";
import Component from "@glimmer/component";
import type { HdsBadgeType } from "hds/_shared";

interface DocStatusComponentSignature {
  Element: HTMLDivElement;
  Args: {
    status?: string;
    hideProgress?: boolean;
    type?: HdsBadgeType;
  };
}

export default class DocStatusComponent extends Component<DocStatusComponentSignature> {
  protected get dasherizedName() {
    let name = "";
    if (typeof this.args.status === "string") {
      name = dasherize(this.args.status);
    }
    switch (name) {
      case "in-review":
      case "approved":
      case "obsolete":
        return name;
      default:
        return "wip";
    }
  }

  protected get status() {
    switch (this.dasherizedName) {
      case "in-review":
        return {
          label: "In review",
          color: "highlight",
        };

      case "approved":
        return {
          label: "Approved",
          color: "success",
        };

      case "obsolete":
        return { label: "Obsolete", color: "neutral" };

      default:
        return {
          label: "WIP",
          color: "neutral",
        };
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::Status": typeof DocStatusComponent;
  }
}
