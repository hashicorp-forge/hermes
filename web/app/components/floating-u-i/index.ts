import { assert } from "@ember/debug";
import { action } from "@ember/object";
import { guidFor } from "@ember/object/internals";
import { Placement } from "@floating-ui/dom";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

interface FloatingUIComponentSignature {
  Args: {
    renderOut?: boolean;
    placement?: Placement;
  };
}

export default class FloatingUIComponent extends Component<FloatingUIComponentSignature> {
  readonly contentID = guidFor(this);

  @tracked _anchor: HTMLElement | null = null;
  @tracked content: HTMLElement | null = null;
  @tracked contentIsShown: boolean = false;

  get anchor() {
    assert("_anchor must exist", this._anchor);
    return this._anchor;
  }

  @action registerAnchor(e: HTMLElement) {
    this._anchor = e;
  }

  @action toggleContent() {
    if (this.contentIsShown) {
      this.hideContent();
    } else {
      this.showContent();
    }
  }

  @action showContent() {
    this.contentIsShown = true;
  }

  @action hideContent() {
    this.contentIsShown = false;
  }
}
