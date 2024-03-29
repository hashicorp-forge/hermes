import Component from "@glimmer/component";
import { OverflowItem } from "hermes/components/overflow-menu";

interface ProjectResourceComponentSignature {
  Element: HTMLDivElement;
  Args: {
    canMoveUp: boolean;
    canMoveDown: boolean;
    overflowMenuItems: Record<string, OverflowItem>;
    isReadOnly?: boolean;
  };
  Blocks: {
    default: [];
  };
}

export default class ProjectResourceComponent extends Component<ProjectResourceComponentSignature> {
  protected get sortOrderMenuItems() {
    return {
      "Move to top": {
        label: "Move to top",
        icon: "arrow-up",
        disabled: !this.args.canMoveUp,
        action: () => {},
      },
      "Move up": {
        label: "Move up",
        icon: "arrow-up",
        disabled: !this.args.canMoveUp,
        action: () => {},
      },
      "Move down": {
        label: "Move down",
        icon: "arrow-down",
        disabled: !this.args.canMoveDown,
        action: () => {},
      },
      "Move to bottom": {
        label: "Move to bottom",
        icon: "arrow-down",
        disabled: !this.args.canMoveDown,
        action: () => {},
      },
    };
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::Resource": typeof ProjectResourceComponent;
  }
}
