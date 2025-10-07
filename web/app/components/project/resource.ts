import Component from "@glimmer/component";
import { OverflowItem } from "hermes/components/overflow-menu";

export enum MoveOptionLabel {
  Top = "Move to top",
  Up = "Move up",
  Down = "Move down",
  Bottom = "Move to bottom",
}

export enum MoveOptionIcon {
  Top = "top",
  Up = "chevron-up",
  Down = "chevron-down",
  Bottom = "bottom",
}

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
      label: MoveOptionLabel.Top,
      icon: MoveOptionIcon.Top,
      action: () => this.args.moveToTop(),
    };

    const moveUp = {
      label: MoveOptionLabel.Up,
      icon: MoveOptionIcon.Up,
      action: () => this.args.moveUp(),
    };

    const moveDown = {
      label: MoveOptionLabel.Down,
      icon: MoveOptionIcon.Down,
      action: () => this.args.moveDown(),
    };

    const moveToBottom = {
      label: MoveOptionLabel.Bottom,
      icon: MoveOptionIcon.Bottom,
      action: () => this.args.moveToBottom(),
    };

    const { canMoveUp, canMoveDown } = this.args;

    const items = [
      canMoveUp ? moveToTop : null,
      canMoveUp ? moveUp : null,
      canMoveDown ? moveDown : null,
      canMoveDown ? moveToBottom : null,
    ];

    return items.filter(Boolean) as { label: MoveOptionLabel; icon: MoveOptionIcon; action: () => void; }[];
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::Resource": typeof ProjectResourceComponent;
  }
}
