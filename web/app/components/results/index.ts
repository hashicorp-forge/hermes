import Component from "@glimmer/component";
import { SearchResponse } from "@algolia/client-search";
import { HermesDocument } from "hermes/types/document";
import { capitalize } from "@ember/string";
import { assert } from "@ember/debug";

interface ResultsIndexComponentSignature {
  Args: {
    results: SearchResponse<HermesDocument>;
    query: string | null;
  };
}

export default class ResultsIndexComponent extends Component<ResultsIndexComponentSignature> {
  get firstPageIsShown(): boolean {
    return this.args.results.page === 0;
  }

  get lowercasedQuery(): string {
    assert('query is required', this.args.query);
    return this.args.query.toLowerCase();
  }

  get capitalizedQuery(): string {
    return capitalize(this.lowercasedQuery);
  }

  get queryIsProductName(): boolean {
    let hits = this.args.results?.hits as HermesDocument[];
    // Assume at least one of the first 12 hits is a product match for the query.
    return hits.some(
      (hit) => hit.product?.toLowerCase() === this.lowercasedQuery
    );
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Results: typeof ResultsIndexComponent;
  }
}
