import Component from "@glimmer/component";
import { SearchScope } from "hermes/routes/authenticated/results";

interface ResultsNavComponentSignature {
  Element: null;
  Args: {
    scope: SearchScope;
    q: string | null;
  };
  Blocks: {
    default: [];
  };
}

export default class ResultsNavComponent extends Component<ResultsNavComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Results::Nav": typeof ResultsNavComponent;
  }
}
