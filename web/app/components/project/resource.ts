import Component from "@glimmer/component";
import { OverflowItem } from "hermes/components/overflow-menu";

interface ProjectResourceComponentSignature {
  Element: HTMLDivElement;
  Args: {
    overflowMenuItems: Record<string, OverflowItem>;
    isReadOnly?: boolean;
    canMoveUp: boolean;
    canMoveDown: boolean;
    moveToTop: () => void;
    moveUp: () => void;
    moveDown: () => void;
    moveToBottom: () => void;
  };
  Blocks: {
    default: [];
  };
}

export default class ProjectResourceComponent extends Component<ProjectResourceComponentSignature> {
  /**
   * The items to display in the overflow menu according
   * to the resource's position in the list.
   */
  protected get sortOrderMenuItems() {
    const moveToTop = {
      label: "Move to top",
      icon: "top",
      action: () => this.args.moveToTop(),
    };

    const moveUp = {
      label: "Move up",
      icon: "chevron-up",
      action: () => this.args.moveUp(),
    };

    const moveDown = {
      label: "Move down",
      icon: "chevron-down",
      action: () => this.args.moveDown(),
    };

    const moveToBottom = {
      label: "Move to bottom",
      icon: "bottom",
      action: () => this.args.moveToBottom(),
    };

    const { canMoveUp, canMoveDown } = this.args;

    const items = [
      canMoveUp ? moveToTop : null,
      canMoveUp ? moveUp : null,
      canMoveDown ? moveDown : null,
      canMoveDown ? moveToBottom : null,
    ];

    return items.compact();
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::Resource": typeof ProjectResourceComponent;
  }
}
