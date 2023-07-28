import { assert } from "@ember/debug";
import { action, computed } from "@ember/object";
import { inject as service } from "@ember/service";
import { Placement } from "@floating-ui/dom";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";
import getProductId from "hermes/utils/get-product-id";

interface InputsTeamSelectSignature {
  Element: HTMLDivElement;
  Args: {
    selectedBU: string | null;
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
};

export default class InputsTeamSelectComponent extends Component<InputsTeamSelectSignature> {
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

  get selectedProductAbbreviation(): string | null {
    if (!this.selected) {
      return null;
    }
    const selectedProduct = this.teams?.[this.selected];
    assert("selected Team must exist", selectedProduct);
    return selectedProduct.abbreviation;
  }

  @action onChange(newValue: any, attributes?: TeamArea) {
    this.selected = newValue;
    this.args.onChange(newValue, attributes);
  }

  @computed("args.selectedBU", "teams")
  get filteredOptions() {
    if (!this.args.selectedBU) {
      return {};
    }

    // Filter the teams based on the selected business unit
    const filteredTeams: TeamAreas = {};
    let teams: TeamAreas | undefined = this.teams;

    for (const team in teams) {
      if (Object.prototype.hasOwnProperty.call(teams, team)) {
        const teamData: TeamArea | undefined = teams[team];
        if (teamData && teamData.BU === this.args.selectedBU) {
          filteredTeams[team] = teamData;
        }
      }
    }
    return filteredTeams;
  }

  protected fetchteams = task(async () => {
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
    "Inputs::TeamSelect": typeof InputsTeamSelectComponent;
  }
}
