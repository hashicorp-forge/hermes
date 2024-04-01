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
    const moveToTopObject = {
      label: "Move to top",
      icon: "top",
      // TODO
      action: () => {},
    };

    const moveUpObject = {
      label: "Move up",
      icon: "chevron-up",
      // TODO
      action: () => {},
    };

    const moveDownObject = {
      label: "Move down",
      icon: "chevron-down",
      // TODO
      action: () => {},
    };

    const moveToBottomObject = {
      label: "Move to bottom",
      icon: "bottom",
      // TODO
      action: () => {},
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
