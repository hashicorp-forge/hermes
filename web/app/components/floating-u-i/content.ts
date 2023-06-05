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

interface FloatingUIContentSignature {
  Args: {
    anchor: HTMLElement;
    id: string;
    placement?: Placement | "none";
    renderOut?: boolean;
    offset?: OffsetOptions;
    isModal?: boolean;
  };
}

export default class FloatingUIContent extends Component<FloatingUIContentSignature> {
  @tracked _content: HTMLElement | null = null;
  @tracked cleanup: (() => void) | null = null;

  get content() {
    assert("_content must exist", this._content);
    return this._content;
  }

  private offset: OffsetOptions = this.args.offset || 5;

  @action didInsert(e: HTMLElement) {
    this._content = e;

    if (this.args.placement === "none") {
      this.content.setAttribute("data-floating-ui-placement", "none");
      this.cleanup = () => {};
      return;
    }

    let updatePosition = async () => {
      let placement = this.args.placement || "bottom-start";

      computePosition(this.args.anchor, this.content, {
        platform,
        placement: placement as Placement,
        middleware: [offset(this.offset), flip(), shift()],
      }).then(({ x, y, placement }) => {
        this.content.setAttribute("data-floating-ui-placement", placement);

        Object.assign(this.content.style, {
          left: `${x}px`,
          top: `${y}px`,
        });
      });
    };

    this.cleanup = autoUpdate(this.args.anchor, this.content, updatePosition);
  }
}
