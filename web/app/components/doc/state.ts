import { dasherize } from "@ember/string";
import Component from "@glimmer/component";

interface DocStateComponentSignature {
  Element: HTMLDivElement;
  Args: {
    state?: string;
    hideProgress?: boolean;
  };
}

export default class DocStateComponent extends Component<DocStateComponentSignature> {
  protected get dasherizedName() {
    let name = "";
    if (typeof this.args.state === "string") {
      name = dasherize(this.args.state);
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

  protected get state() {
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
    "Doc::State": typeof DocStateComponent;
  }
}
