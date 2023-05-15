import Component from "@glimmer/component";

interface XDropdownListLinkToComponentSignature {
  Element: HTMLAnchorElement;
  Args: {
    registerElement: () => void;
    focusMouseTarget: () => void;
    onClick: () => void;
    disabled?: boolean;
    ariaControls: string;
    role: string;
    isAriaSelected: boolean;
    isAriaChecked: boolean;
    route: string;
    query?: string;
    model?: unknown;
    models?: unknown[];
  };
  Blocks: {
    default: [];
  }
}

export default class XDropdownListLinkToComponent extends Component<XDropdownListLinkToComponentSignature> {
  /**
   * The models, if any, to pass to the route.
   * Allows the component to support all model scenarios without
   * hitting internal Ember assertions.
   */
  protected get models() {
    if (this.args.models) {
      return this.args.models;
    } else {
      return this.args.model ? [this.args.model] : [];
    }
  }
  /**
   * The query, if any, to pass to the route.
   * Workaround for https://github.com/emberjs/ember.js/issues/19693
   * Can be removed when we upgrade to Ember 3.28+
   */
  protected get query() {
    return this.args.query || {};
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "x/dropdown-list/link-to": typeof XDropdownListLinkToComponent;
  }
}
