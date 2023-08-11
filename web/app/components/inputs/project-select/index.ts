import { assert } from "@ember/debug";
import {action, computed} from "@ember/object";
import { inject as service } from "@ember/service";
import { Placement } from "@floating-ui/dom";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";
import getProductId from "hermes/utils/get-product-id";

interface InputsProjectSelectSignature {
  Element: HTMLDivElement;
  Args: {
    selectedteam: string | null;
    selected?: string;
    onChange: (value: string, attributes?: TeamArea) => void;
    formatIsBadge?: boolean;
    placement?: Placement;
    isSaving?: boolean;
    renderOut?: boolean;
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

 export type ProjectArea = {
  teamid: string;
};


export default class InputsProjectSelectComponent extends Component<InputsProjectSelectSignature> {
  @service("fetch") declare fetchSvc: FetchService;

  @tracked selected = this.args.selected;
  @tracked teams: TeamAreas | undefined = undefined;

  get icon(): string {
    let icon = "folder";
    if (this.selected && getProductId(this.selected)) {
      icon = getProductId(this.selected) as string;
    }
    return icon;
  }

  @action onChange(newValue: any, attributes?: TeamArea) {
    this.selected = newValue;
    this.args.onChange(newValue, attributes);
  }

  @computed('args.selectedteam', 'teams')
  get filteredOptions() {
    if (!this.args.selectedteam) {
      return {};
    }
    // else return the correstponding projects present in the 
    // team selected
    const teams: TeamAreas | undefined = this.teams;
    if (teams){
      return teams[this.args.selectedteam]?.projects;
    }
  }

    protected fetchprojects = task(async () => {
      try {
        // Filter the teams based on the selected business unit
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
    "Inputs::ProjectSelect": typeof InputsProjectSelectComponent;
  }
}
