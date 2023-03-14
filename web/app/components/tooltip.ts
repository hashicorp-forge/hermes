import { action } from "@ember/object";
import { Placement } from "@floating-ui/core";
import {
  platform,
  arrow,
  computePosition,
  flip,
  offset,
} from "@floating-ui/dom";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { assert } from "@ember/debug";

interface TooltipComponentSignature {
  Element: null;
  Args: {
    text: string;
    placement?: Placement;
  };
}

export default class TooltipComponent extends Component<TooltipComponentSignature> {
  @tracked private _reference: HTMLElement | null = null;
  @tracked private _content: HTMLElement | null = null;
  @tracked private _arrow: HTMLElement | null = null;

  @tracked protected contentIsShown = false;

  protected get reference(): HTMLElement {
    assert("reference must exist", this._reference);
    return this._reference;
  }

  protected get content(): HTMLElement {
    assert("content must exist", this._content);
    return this._content;
  }

  protected get arrow(): HTMLElement {
    assert("arrow must exist", this._arrow);
    return this._arrow;
  }

  @action protected didInsertReference(element: HTMLElement) {
    this._reference = element;
  }

  @action protected didInsertArrow(element: HTMLElement): void {
    this._arrow = element;
  }

  @action showContent() {
    this.contentIsShown = true;
  }

  @action hideContent() {
    this.contentIsShown = false;
  }

  @action toggleContent() {
    this.contentIsShown = !this.contentIsShown;
  }

  @action protected didInsertContent(element: HTMLElement) {
    this._content = element;

    computePosition(this.reference, this.content, {
      platform: platform,
      placement: this.args.placement || "top",
      middleware: [
        offset(8),
        flip(),
        arrow({
          element: this.arrow,
        }),
      ],
    }).then(({ x, y, middlewareData }) => {
      Object.assign(this.content.style, {
        left: `${x}px`,
        top: `${y}px`,
      });

      // https://floating-ui.com/docs/arrow#usage
      if (middlewareData.arrow) {
        const { x } = middlewareData.arrow;
        Object.assign(this.arrow.style, {
          left: x != null ? `${x}px` : "",
          top: `${-this.arrow.offsetWidth / 2}px`,
          transform: "rotate(45deg)",
        });
      }
    });
  }
}
