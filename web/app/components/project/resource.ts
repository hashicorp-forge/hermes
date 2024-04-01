import Component from "@glimmer/component";
import { OverflowItem } from "hermes/components/overflow-menu";

interface ProjectResourceComponentSignature {
  Element: HTMLDivElement;
  Args: {
    canMoveUp: boolean;
    canMoveDown: boolean;
    overflowMenuItems: Record<string, OverflowItem>;
    isReadOnly?: boolean;
    moveToTop: () => void;
    moveUp: () => void;
    moveDown: () => void;
    moveToBottom: () => void;
    id: string;
  };
  Blocks: {
    default: [];
  };
}

export default class ProjectResourceComponent extends Component<ProjectResourceComponentSignature> {
  protected get sortOrderMenuItems() {
    const moveToTopObject = {
      label: "Move to top",
      icon: "top",
      action: () => this.args.moveToTop(),
    };

    const moveUpObject = {
      label: "Move up",
      icon: "chevron-up",
      action: () => this.args.moveUp(),
    };

    const moveDownObject = {
      label: "Move down",
      icon: "chevron-down",
      action: () => this.args.moveDown(),
    };

    const moveToBottomObject = {
      label: "Move to bottom",
      icon: "bottom",
      action: () => this.args.moveToBottom(),
    };

    const { canMoveUp, canMoveDown } = this.args;

    const items = [
      canMoveUp ? moveToTopObject : null,
      canMoveUp ? moveUpObject : null,
      canMoveDown ? moveDownObject : null,
      canMoveDown ? moveToBottomObject : null,
    ];

    return items.compact();
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::Resource": typeof ProjectResourceComponent;
  }
}
