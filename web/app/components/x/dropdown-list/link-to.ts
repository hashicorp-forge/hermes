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
  /**
   * The action to close the dropdown. Called on click.
   * We wait until the next run loop so that we don't interfere with
   * Ember's <LinkTo> handling. Because this approach causes issues
   * when testing, we use `schedule` as an approximation.
   */
  @action protected hideDropdown(): void {
    if (Ember.testing) {
      schedule("afterRender", this.args.hideContent);
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
