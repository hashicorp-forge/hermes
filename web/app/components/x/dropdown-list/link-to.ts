import Component from "@glimmer/component";
import { XDropdownListActionComponentArgs } from "./action";

interface XDropdownListLinkToComponentSignature {
  Element: HTMLAnchorElement;
  Args: XDropdownListActionComponentArgs & {
    route: string;
    query?: Record<string, unknown> | unknown;
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
