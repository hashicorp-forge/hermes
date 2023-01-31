import Component from "@glimmer/component";
import { SearchResponse } from "@algolia/client-search";

interface ResultsIndexComponentSignature {
  Args: {
    results?: SearchResponse;
    query: string;
  };
}

export default class ResultsIndexComponent extends Component<ResultsIndexComponentSignature> {}
