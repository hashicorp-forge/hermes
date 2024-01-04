import Component from "@glimmer/component";
import { XDropdownListInteractiveComponentArgs } from "./_shared";
import { action } from "@ember/object";
import Ember from "ember";
import { next, schedule } from "@ember/runloop";

interface XDropdownListLinkToComponentSignature {
  Element: HTMLAnchorElement;
  Args: XDropdownListInteractiveComponentArgs & {
    route: string;
    query?: Record<string, unknown>;
    model?: unknown;
    models?: unknown[];
    hideContent: () => void;
  };
  Blocks: {
    default: [];
  };
}

export default class XDropdownListLinkToComponent extends Component<XDropdownListLinkToComponentSignature> {
  @action onClick(): void {
    if (Ember.testing) {
      schedule("afterRender", () => {
        this.args.hideContent();
      });
    } else {
      next(() => {
        this.args.hideContent();
      });
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "x/dropdown-list/link-to": typeof XDropdownListLinkToComponent;
  }
}
