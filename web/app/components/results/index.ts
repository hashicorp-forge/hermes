import Component from "@glimmer/component";
import { SearchResponse } from "@algolia/client-search";
import { HermesDocument } from "hermes/types/document";

interface ResultsIndexComponentSignature {
  Args: {
    docResults?: SearchResponse<HermesDocument>;
    query: string | null;
  };
}

export default class ResultsIndexComponent extends Component<ResultsIndexComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Results: typeof ResultsIndexComponent;
  }
}
