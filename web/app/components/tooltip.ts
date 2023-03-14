import { action } from "@ember/object";
import { computePosition } from "@floating-ui/dom";
import { Placement } from "@floating-ui/core";
import { platform } from "@floating-ui/dom";
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
  @tracked reference: HTMLElement | null = null;
  @tracked content: HTMLElement | null = null;

  @tracked contentIsShown = false;

  @action didInsertReference(element: HTMLElement) {
    this.reference = element;
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

  @action didInsertContent(element: HTMLElement) {
    this.content = element;

    assert("reference must exist", this.reference);

    computePosition(this.reference, this.content, {
      placement: this.args.placement || "top",
      platform: platform,
    }).then(({ x, y }) => {
      assert("content must exist", this.content);
      Object.assign(this.content.style, {
        left: `${x}px`,
        top: `${y}px`,
      });
    });
  }
}
