import { assert } from "@ember/debug";
import { action } from "@ember/object";
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
  BU: string
};

export default class InputsTeamSelectComponent extends Component<InputsTeamSelectSignature> {
  @service("fetch") declare fetchSvc: FetchService;

  @tracked selected = this.args.selected;

  @tracked teams: TeamAreas | undefined = undefined;
  @tracked selectedBU: string | null = null;

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

  // @action onBUChange(){
  //   this.selectedBU = this.args.selectedBU;
  //   this.fetchteams.perform();
  // }

  // protected fetchProducts = task(async () => {
  //   try {
  //     let products = await this.fetchSvc
  //       .fetch("/api/v1/products")
  //       .then((resp) => resp?.json());
  //     this.products = products;
  //   } catch (err) {
  //     console.error(err);
  //     throw err;
  //   }
  // });
    protected fetchteams = task(async () => {
      try {
        // this.selectedBU = this.args.selectedBU;
        // Filter the teams based on the selected business unit
        // console.log("parent injected value is: ",this.selectedBU)
        // let teams: TeamAreas = {
        this.teams = {
          "Spinage": {
            "abbreviation": "SPI",
            "perDocDataType": null,
            "BU": "Platform"
          },
          "RECON": {
            "abbreviation": "RCN",
            "perDocDataType": null,
            "BU": "Platform"
          },
          "Dev-Prod": {
            "abbreviation": "DP",
            "perDocDataType": null,
            "BU": "Platform"
          },
          "Team A-cap": {
            "abbreviation": "A-Cap",
            "perDocDataType": null,
            "BU": "Capital"
          },
          "Team B-cap": {
            "abbreviation": "B-cap",
            "perDocDataType": null,
            "BU": "Capital"
          },
          "Team A-X": {
            "abbreviation": "A-x",
            "perDocDataType": null,
            "BU": "X"
          },
          "Team B-x": {
            "abbreviation": "bx",
            "perDocDataType": null,
            "BU": "X"
          },
          "Team d-paymnt": {
            "abbreviation": "d-pay",
            "perDocDataType": null,
            "BU": "Payments"
          },
        };
      // // Filter the teams based on the selected business unit
      // const filteredTeams: TeamAreas = {};
      //
      // for (const team in teams) {
      //   if (Object.prototype.hasOwnProperty.call(teams, team)) {
      //     const teamData: TeamArea | undefined = teams[team];
      //     if (teamData && teamData.BU  === this.selectedBU) {
      //       filteredTeams[team] = teamData;
      //     }
      //   }
      // }
      // console.log("Here i am");
      // console.log(filteredTeams)
      // this.teams = filteredTeams;
      } catch (err) {
        console.error(err);
        throw err;
      }
    });

}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::TeamSelect": typeof InputsTeamSelectComponent;
  }
}
