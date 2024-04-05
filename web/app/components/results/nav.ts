import Component from "@glimmer/component";
import { SearchScope } from "hermes/routes/authenticated/results";
import { DEFAULT_FILTERS } from "hermes/services/active-filters";

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

  projectsQuery = {
    ...DEFAULT_FILTERS,
    scope: SearchScope.Projects,
    page: 1,
  };

  docsQuery = {
    ...DEFAULT_FILTERS,
    scope: SearchScope.Docs,
    page: 1,
  };

  allQuery = {
    ...DEFAULT_FILTERS,
    scope: SearchScope.All,
    page: 1,
  };
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Results::Nav": typeof ResultsNavComponent;
  }
}
