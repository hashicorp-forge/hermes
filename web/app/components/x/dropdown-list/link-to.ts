import Component from "@glimmer/component";
import { XDropdownListInteractiveComponentArgs } from "./_shared";

interface XDropdownListLinkToComponentSignature {
  Element: HTMLAnchorElement;
  Args: XDropdownListInteractiveComponentArgs & {
    route: string;
    query?: Record<string, unknown>;
    model?: unknown;
    models?: unknown[];
  };
  Blocks: {
    default: [];
  };
}

export default class XDropdownListLinkToComponent extends Component<XDropdownListLinkToComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "x/dropdown-list/link-to": typeof XDropdownListLinkToComponent;
  }
}
