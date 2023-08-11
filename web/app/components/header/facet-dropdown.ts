import Component from "@glimmer/component";
import { FacetDropdownObjects } from "hermes/types/facets";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";

interface HeaderFacetDropdownComponentSignature {
  Element: HTMLDivElement;
  Args: {
    label: string;
    facets: FacetDropdownObjects | null;
    disabled?: boolean;
  };
}
type TeamAreas = {
  [key: string]: TeamArea;
};

export type TeamArea = {
  abbreviation: string;
  perDocDataType: unknown;
  BU: string;
  projects: ProjectAreas;
};
type ProjectAreas = {
  [key: string]: ProjectAreas;
};

export default class HeaderFacetDropdownComponent extends Component<HeaderFacetDropdownComponentSignature> {
  @service declare router: RouterService;
  @service("fetch") declare fetchSvc: FetchService;

  @tracked teams: TeamAreas | undefined = undefined;

  protected get currentRouteName() {
    return this.router.currentRouteName;
  }
  protected fetchteams = task(async () => {
    try {
      this.teams = await this.fetchSvc
        .fetch("/api/v1/teams")
        .then((resp) => resp?.json());
    } catch (err) {
      throw err;
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Header::FacetDropdown": typeof HeaderFacetDropdownComponent;
  }
}
