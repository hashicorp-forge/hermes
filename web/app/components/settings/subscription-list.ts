import Component from "@glimmer/component";
import { restartableTask } from "ember-concurrency";
import { tracked } from "@glimmer/tracking";
import { service } from "@ember/service";
import ProductAreasService from "hermes/services/product-areas";

interface SettingsSubscriptionListComponentSignature {
  Args: {
    allProductAreas: string[];
  };
}

export default class SettingsSubscriptionListComponent extends Component<SettingsSubscriptionListComponentSignature> {
  @service declare productAreas: ProductAreasService;

  /**
   * The list of product areas to show. Updated by the `onInput` task.
   */
  @tracked protected shownItems: string[] = this.args.allProductAreas;

  /**
   * Searches for matches and updates the `filteredList`.
   * Restarts on every keystroke and resets when the input is empty.
   */
  protected onInput = restartableTask(async (event) => {
    let input = event.target.value;
    if (input.length > 0) {
      this.shownItems = this.args.allProductAreas.filter((item) =>
        item.toLowerCase().includes(input.toLowerCase()),
      );
    } else {
      this.shownItems = this.args.allProductAreas;
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Settings::SubscriptionList": typeof SettingsSubscriptionListComponent;
  }
}
