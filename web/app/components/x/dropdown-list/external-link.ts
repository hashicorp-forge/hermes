import Component from "@glimmer/component";
import type { XDropdownListInteractiveComponentArgs } from "./_shared";

interface XDropdownListExternalLinkComponentSignature {
  Element: HTMLAnchorElement;
  Args: XDropdownListInteractiveComponentArgs & {
    iconIsShown?: boolean;
  };
  Blocks: {
    default: [];
  };
}

export default class XDropdownListExternalLinkComponent extends Component<XDropdownListExternalLinkComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "x/dropdown-list/external-link": typeof XDropdownListExternalLinkComponent;
  }
}
