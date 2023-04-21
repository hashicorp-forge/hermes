import { assert } from "@ember/debug";
import { action } from "@ember/object";
import { guidFor } from "@ember/object/internals";
import {
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
    content: HTMLElement | null;
    placement?: Placement;
    renderOut?: boolean;
    registerContent: (e: HTMLElement) => void;
  };
}

export default class FloatingUIContent extends Component<FloatingUIContentSignature> {
  readonly id = guidFor(this);

  @tracked cleanup: (() => void) | null = null;

  get content() {
    assert("_this.args.content must exist", this.args.content);
    return this.args.content;
  }

  @action didInsert(e: HTMLElement) {
    this.args.registerContent(e);

    let updatePosition = async () => {
      computePosition(this.args.anchor, this.content, {
        platform: platform,
        placement: this.args.placement || "bottom-start",
        middleware: [offset(5), flip(), shift()],
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
