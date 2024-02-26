import Component from "@glimmer/component";
import { SearchScope } from "hermes/routes/authenticated/results";

interface ResultsNavComponentSignature {
  Element: HTMLDivElement;
  Args: {
    scope: SearchScope;
    q: string | null;
    docCount?: number;
    projectCount?: number;
  };
  Blocks: {
    default: [];
  };
}

export default class ResultsNavComponent extends Component<ResultsNavComponentSignature> {
  allScope = SearchScope.All;
  projectsScope = SearchScope.Projects;
  docsScope = SearchScope.Docs;
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Results::Nav": typeof ResultsNavComponent;
  }
}
