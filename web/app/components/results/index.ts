import Component from "@glimmer/component";
import { SearchResponse } from "hermes/services/search";
import { HermesDocument } from "hermes/types/document";
import { HermesProject } from "hermes/types/project";
import { SearchScope } from "hermes/routes/authenticated/results";
import { SearchForFacetValuesResponse } from "hermes/services/search";

interface ResultsIndexComponentSignature {
  Args: {
    docResults?: SearchResponse<HermesDocument>;
    projectResults?: SearchResponse<HermesProject>;
    productResults?: SearchForFacetValuesResponse;
    query: string | null;
  };
}

export default class ResultsIndexComponent extends Component<ResultsIndexComponentSignature> {
  /**
   * The enum for the project search scope.
   * Used in the template to satisfy type checks.
   */
  protected projectsScope = SearchScope.Projects;

  /**
   * The enum for the docs search scope.
   * Used in the template to satisfy type checks.
   */
  protected docsScope = SearchScope.Docs;

  /**
   * Whether the current scope is "all".
   * Used in template and getter logic.
   */
  protected get scopeIsAll(): boolean {
    return this.scope === SearchScope.All;
  }

  /**
   * The hit count, whether documents or projects.
   * Used in the template to determine headlines and content visibility.
   */
  protected get nbHits(): number {
    return (
      this.args.docResults?.nbHits || this.args.projectResults?.nbHits || 0
    );
  }

  /**
   * The current page, whether documents or projects.
   * Passed to the `Pagination` component.
   */
  protected get page() {
    return (
      (this.args.docResults?.page || this.args.projectResults?.page || 0) + 1
    );
  }

  /**
   * The number of pages, whether documents or projects.
   * Passed to the `Pagination` component.
   */
  protected get nbPages() {
    return (
      this.args.docResults?.nbPages || this.args.projectResults?.nbPages || 0
    );
  }

  /**
   * The document hits, if they exist.
   * Used as shorthand in the template.
   */
  protected get docHits() {
    return this.args.docResults?.hits;
  }

  /**
   * The project hits, if they exist.
   * Used as shorthand in the template.
   * If the scope is "all", we only show 5 projects.
   */
  protected get projectHits() {
    const maybeHits = this.args.projectResults?.hits;

    if (this.scopeIsAll) {
      return maybeHits?.slice(0, 5);
    }

    return maybeHits;
  }

  /**
   * The product hits, if they exist.
   * Used as shorthand in the template.
   */
  protected get productFacetHits() {
    return this.args.productResults?.facetHits;
  }

  /**
   * Whether the "next page of docs" link is shown.
   * True on the first page of `all` results when there are more
   * than one page of docs. When true, a link to the next page of
   * docs is shown.
   */
  protected get nextPageLinkIsShown() {
    if (!this.scopeIsAll) return false;

    const { docResults } = this.args;

    return docResults?.page === 0 && docResults?.nbPages > 1;
  }

  /**
   * The current scope of the search results.
   * If docResults and projectResults are both present, the scope is All,
   * otherwise, it is Projects or Docs, depending on which is passed in.
   * Used in the template to determine which results to show.
   */
  protected get scope(): string {
    if (this.args.docResults && this.args.projectResults) {
      return SearchScope.All;
    } else if (this.args.projectResults) {
      return SearchScope.Projects;
    } else {
      return SearchScope.Docs;
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Results: typeof ResultsIndexComponent;
  }
}
