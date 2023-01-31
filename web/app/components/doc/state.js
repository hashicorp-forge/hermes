import { dasherize } from "@ember/string";
import Component from "@glimmer/component";

/**
 * Args:
 *   @state?: string; the doc's status, e.g., 'in review'
 *   @hideProgress?: boolean; whether to hide the progress bar
 */

export default class State extends Component {
  get dasherizedName() {
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

  get state() {
    switch (this.dasherizedName) {
      case "in-review":
        return {
          label: "In review",
          color: "highlight",
          barOneClass:
            "bg-[color:var(--token-color-palette-purple-200)] opacity-75",
          barTwoClass: "bg-[color:var(--token-color-palette-purple-200)] h-1",
        };

      case "approved":
        return {
          label: "Approved",
          color: "success",
          barOneClass:
            "bg-[color:var(--token-color-palette-green-200)] opacity-75",
          barTwoClass:
            "bg-[color:var(--token-color-palette-green-200)] opacity-75",
          barThreeClass: "bg-[color:var(--token-color-palette-green-200)] h-1",
        };

      case "obsolete":
        return { label: "Obsolete", color: "neutral" };

      default:
        return {
          label: "WIP",
          color: "neutral",
          barOneClass: "bg-[color:var(--token-color-palette-blue-200)] h-1",
        };
    }
  }
}
