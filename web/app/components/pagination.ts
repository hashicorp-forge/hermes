import Component from "@glimmer/component";
import { service } from "@ember/service";
import RouterService from "@ember/routing/router-service";

interface PaginationComponentSignature {
  Args: {
    nbPages?: number;
    currentPage?: number;
  };
}

export default class PaginationComponent extends Component<PaginationComponentSignature> {
  @service declare router: RouterService;

  protected get currentRouteName(): string {
    return this.router.currentRouteName;
  }

  get pages(): number[] {
    if (!this.args.nbPages || !this.args.currentPage) {
      return [];
    }

    let pages = [];

    // If there are less than 10 pages of results, show all pages.
    // Or if the current page is 6 or less and there are more than 10 pages of
    // results, show the first 10 pages.
    if (this.args.nbPages < 10 || this.args.currentPage <= 6) {
      for (let i = 1; i <= this.args.nbPages && i <= 10; i++) {
        pages.push(i);
      }
    } else if (this.args.nbPages - this.args.currentPage <= 4) {
      // We're at the end of the results so show the last 10 pages.
      for (let i = this.args.nbPages - 9; i <= this.args.nbPages; i++) {
        pages.push(i);
      }
    } else {
      // We're in the middle of the results, so show pages (current-5) to
      // (current+4).
      for (
        let i = this.args.currentPage - 5;
        i <= this.args.currentPage + 4;
        i++
      ) {
        pages.push(i);
      }
    }
    return pages;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Pagination: typeof PaginationComponent;
  }
}
