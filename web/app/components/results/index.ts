import Component from "@glimmer/component";
import { SearchResponse } from "@algolia/client-search";
import { HermesDocument } from "hermes/types/document";
import { HermesProject } from "hermes/types/project";
import { SearchScope } from "hermes/routes/authenticated/results";
import { SearchForFacetValuesResponse } from "instantsearch.js";

interface ResultsIndexComponentSignature {
  Args: {
    docResults?: SearchResponse<HermesDocument>;
    projectResults?: SearchResponse<HermesProject>;
    productResults?: SearchForFacetValuesResponse;
    query: string;
  };
}

export default class ResultsIndexComponent extends Component<ResultsIndexComponentSignature> {
  allScope = SearchScope.All;
  projectsScope = SearchScope.Projects;
  docsScope = SearchScope.Docs;

  /**
   * The number of hits for the current query,
   * whether documents or projects.
   */
  protected get nbHits(): number {
    return (
      this.args.docResults?.nbHits || this.args.projectResults?.nbHits || 0
    );
  }

  /**
   * The current scope of the search results.
   * If docResults and projectResults are both present, the scope is All,
   * otherwise, it is Projects or Docs, depending on which is passed in.
   * Used in the template to determine which results to show.
   */
  protected get currentScope(): string {
    if (this.args.docResults && this.args.projectResults) {
      return SearchScope.All;
    } else if (this.args.projectResults) {
      return SearchScope.Projects;
    } else {
      return SearchScope.Docs;
    }
  }

  protected get currentScopeIsAll(): boolean {
    return this.currentScope === SearchScope.All;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Results: typeof ResultsIndexComponent;
  }
}
