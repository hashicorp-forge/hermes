import Component from "@glimmer/component";
import { SearchResponse } from "@algolia/client-search";
import { HermesDocument } from "hermes/types/document";
import { capitalize } from "@ember/string";
import { HermesProject } from "hermes/types/project";
import { SearchScope } from "hermes/routes/authenticated/results";

interface ResultsIndexComponentSignature {
  Args: {
    docResults?: SearchResponse<HermesDocument>;
    projectResults?: SearchResponse<HermesProject>;
    // TODO: type this
    productResults?: SearchResponse<unknown>;
    query: string;
  };
}

export default class ResultsIndexComponent extends Component<ResultsIndexComponentSignature> {
  allScope = SearchScope.All;
  projectsScope = SearchScope.Projects;
  docsScope = SearchScope.Docs;

  protected get hitCount(): number {
    return (
      (this.args.docResults?.nbHits || 0) +
      (this.args.projectResults?.nbHits || 0)
    );
  }

  protected get currentScope(): string {
    if (this.args.docResults && this.args.projectResults) {
      return SearchScope.All;
    } else if (this.args.projectResults) {
      return SearchScope.Projects;
    } else {
      return SearchScope.Docs;
    }
  }

  get lowercasedQuery(): string {
    return this.args.query?.toLowerCase();
  }

  get capitalizedQuery(): string {
    return capitalize(this.lowercasedQuery);
  }

  get productsAreShown(): boolean {
    let hits = this.args.docResults?.hits as HermesDocument[];
    // Assume at least one of the first 12 hits is a product match for the query.
    return hits.some(
      (hit) => hit.product?.toLowerCase() === this.lowercasedQuery,
    );
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Results: typeof ResultsIndexComponent;
  }
}
