import Component from "@glimmer/component";
import { XDropdownListInteractiveComponentArgs } from "./_shared";
import { action } from "@ember/object";
import { isTesting } from "@embroider/macros";
import { next, schedule } from "@ember/runloop";
import { service } from "@ember/service";
import RouterService from "@ember/routing/router-service";

interface XDropdownListLinkToComponentSignature {
  Element: HTMLAnchorElement;
  Args: XDropdownListInteractiveComponentArgs & {
    route?: string;
    query?: Record<string, unknown>;
    model?: unknown;
    models?: unknown[];
  };
  Blocks: {
    default: [];
  };
}

export default class XDropdownListLinkToComponent extends Component<XDropdownListLinkToComponentSignature> {
  @service declare router: RouterService;

  /**
   * The route passed to Ember's <LinkTo> component.
   * Uses the passed-in value or the current route name.
   */
  protected get route() {
    return this.args.route ?? this.router.currentRouteName;
  }
  /**
   * The action to run when the item is clicked.
   * We wait until the next run loop so that we don't interfere with
   * Ember's <LinkTo> handling. Because this approach causes issues
   * when testing, we use `schedule` as an approximation.
   */
  @action protected onClick(): void {
    if (isTesting()) {
      schedule("afterRender", this.args.onClick);
    } else {
      next(() => {
        this.args.onClick();
      });
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "x/dropdown-list/link-to": typeof XDropdownListLinkToComponent;
  }
}
