import Component from "@glimmer/component";

interface PaginationLinkComponentSignature {
  Element: HTMLAnchorElement;
  Args: {
    disabled?: boolean;
    icon?: string;
    page?: number;
  };
}

export default class PaginationLinkComponent extends Component<PaginationLinkComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Pagination::Link": typeof PaginationLinkComponent;
  }
}
