import { assert } from "@ember/debug";
import { action } from "@ember/object";
import {
  OffsetOptions,
  Placement,
  autoUpdate,
  computePosition,
  flip,
  offset,
  platform,
  shift,
} from "@floating-ui/dom";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

export type MatchAnchorWidthOptions =
  | boolean
  | {
      enabled: boolean;
      additionalWidth: number;
    };

interface FloatingUIContentSignature {
  Element: HTMLDivElement;
  Args: {
    anchor: HTMLElement;
    id: string;
    // TODO: Move null logic to a parent component.
    placement?: Placement | null;
    renderOut?: boolean;
    offset?: OffsetOptions;
    matchAnchorWidth?: MatchAnchorWidthOptions;
    hide: () => void;
  };
  Blocks: {
    default: [];
  };
}

export default class FloatingUIContent extends Component<FloatingUIContentSignature> {
  @tracked _content: HTMLElement | null = null;
  @tracked cleanup: (() => void) | null = null;

  get content() {
    assert("_content must exist", this._content);
    return this._content;
  }

  /**
   * The target element to append the content to.
   * If a dialog is open, append to it, since it's the
   * topmost layer, otherwise append to the application body.
   */
  protected get inElementTarget() {
    const dialog = document.querySelector("dialog");

    if (dialog) {
      return "dialog";
    } else {
      return ".ember-application";
    }
  }

  private offset: OffsetOptions = this.args.offset || 5;

  @action didInsert(e: HTMLElement) {
    this._content = e;

    const { anchor, placement } = this.args;
    const { content } = this;

    this.maybeMatchAnchorWidth();

    if (placement === null) {
      content.removeAttribute("data-floating-ui-placement");
      content.classList.add("non-floating-content");
      this.cleanup = () => {};
      return;
    }

    let updatePosition = async () => {
      let _placement = placement || "bottom-start";

      /**
       * If anchor exists within a div that's being dragged, hide the content
       * to prevent the dropdown from remaining open after its parent is dragged.
       * The `is-dragging` class is added by Pragmatic Drag and Drop.
       */
      const elementBeingDragged = document.querySelector(".is-dragging");

      if (elementBeingDragged && elementBeingDragged.contains(anchor)) {
        this.args.hide();
        return;
      }

      computePosition(anchor, content, {
        platform,
        placement: _placement as Placement,
        middleware: [offset(this.offset), flip(), shift()],
      }).then(({ x, y, placement }) => {
        this.maybeMatchAnchorWidth();
        content.setAttribute("data-floating-ui-placement", placement);

        Object.assign(content.style, {
          left: `${x}px`,
          top: `${y}px`,
        });
      });
    };

    this.cleanup = autoUpdate(anchor, content, updatePosition, {
      // Recompute on layout shifts such as drag and drop.
      layoutShift: true,
    });
  }

  private maybeMatchAnchorWidth() {
    const { matchAnchorWidth, anchor } = this.args;
    const { content } = this;

    if (!matchAnchorWidth) {
      return;
    }

    if (typeof matchAnchorWidth === "boolean") {
      content.style.width = `${anchor.offsetWidth}px`;
    } else {
      content.style.width = `${
        anchor.offsetWidth + matchAnchorWidth.additionalWidth
      }px`;
    }

    content.style.maxWidth = "none";
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "FloatingUI::Content": typeof FloatingUIContent;
  }
}
