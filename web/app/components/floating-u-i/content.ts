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
import htmlElement from "hermes/utils/html-element";

interface XHdsPopoverSignature {
  Args: {
    anchor: HTMLElement;
    placement?: Placement;
    renderOut?: boolean;
  };
}

export default class XHdsPopover extends Component<XHdsPopoverSignature> {
  @tracked _popover: HTMLElement | null = null;

  get id() {
    return guidFor(this);
  }

  get popover() {
    assert("_popover must exist", this._popover);
    return this._popover;
  }

  get arrow() {
    return htmlElement(`#popover-${this.id} .arrow`);
  }

  @tracked cleanup: (() => void) | null = null;

  @action didInsert(e: HTMLElement) {
    this._popover = e;

    let updatePosition = async () => {
      computePosition(this.args.anchor, this.popover, {
        platform: platform,
        placement: this.args.placement || "bottom",
        middleware: [offset(5), flip(), shift()],
      }).then(({ x, y, placement }) => {
        this.popover.setAttribute("data-popover-placement", placement);

        Object.assign(this.popover.style, {
          left: `${x}px`,
          top: `${y}px`,
        });
      });
    };

    this.cleanup = autoUpdate(this.args.anchor, this.popover, updatePosition);
  }
}
