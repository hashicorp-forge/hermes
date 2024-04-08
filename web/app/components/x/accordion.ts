import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

interface XAccordionComponentSignature {
  Element: null;
  Args: {};
  Blocks: {
    default: [];
    toggle: [];
    content: [];
  };
}

export default class XAccordionComponent extends Component<XAccordionComponentSignature> {
  @tracked contentIsShown = false;

  @action protected toggleContent() {
    this.contentIsShown = !this.contentIsShown;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "X::Accordion": typeof XAccordionComponent;
  }
}
