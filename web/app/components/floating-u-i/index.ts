import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

interface FloatingUIComponentSignature {
  Args: {};
}

export default class FloatingUIComponent extends Component<FloatingUIComponentSignature> {
  @tracked anchor: HTMLElement | null = null;
  @tracked contentIsShown: boolean = false;

  @action registerAnchor(e: HTMLElement) {
    this.anchor = e;
  }

  @action toggleContent() {
    this.contentIsShown = !this.contentIsShown;
  }

  @action hideContent() {
    this.contentIsShown = false;
  }
}
