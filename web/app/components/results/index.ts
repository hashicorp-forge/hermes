import Component from "@glimmer/component";
import { SearchResponse } from "@algolia/client-search";
import { HermesDocument } from "hermes/types/document";
import { capitalize } from "@ember/string";
import { HermesProject } from "hermes/types/project";

interface ResultsIndexComponentSignature {
  Args: {
    docResults?: SearchResponse<HermesDocument>;
    projectResults?: SearchResponse<HermesProject>;
    query: string;
  };
}

export default class ResultsIndexComponent extends Component<ResultsIndexComponentSignature> {
  /**
   * TODO: Explain this
   */
  get firstPageIsShown(): boolean {
    return this.args.docResults?.page === 0;
  }

  get lowercasedQuery(): string {
    return this.args.query?.toLowerCase();
  }

  get capitalizedQuery(): string {
    return capitalize(this.lowercasedQuery);
  }

  get queryIsProductName(): boolean {
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
