import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import { task } from "ember-concurrency";
import { action } from "@ember/object";

export interface GoogleUser {
  emailAddresses: { value: string }[];
  photos: { url: string }[];
}

interface PeopleSelectComponentSignature {
  Args: {
    selected: GoogleUser[];
    onBlur?: () => void;
    onChange: (people: GoogleUser[]) => void;
  };
}

export default class PeopleSelectComponent extends Component<PeopleSelectComponentSignature> {
  // @ts-ignore
  // FetchService not yet in the registry
  @service("fetch") declare fetchSvc: any;

  /**
   * The list of people to display in the dropdown.
   * Instantiated empty and populated by the `searchDirectory` task.
   */
  @tracked protected people = [];

  /**
   * An action occurring on every keystroke.
   * Handles cases where the user clears the input,
   * since `onChange` is not called in that case.
   * See: https://ember-power-select.com/docs/custom-search-action
   */
  @action onInput(inputValue: string) {
    if (inputValue === "") {
      this.people = [];
    }
  }

  /**
   * The action taken when focus leaves the component.
   * Clears the people list and calls `this.args.onBlur` if it exists.
   */
  @action onClose() {
    this.people = [];
    if (this.args.onBlur) {
      this.args.onBlur();
    }
  }

  /**
   * A task that queries the server for people matching the given query.
   * Used as the `search` action for the `ember-power-select` component.
   * Sets `this.people` to the results of the query.
   */
  protected searchDirectory = task(async (query) => {
    try {
      const res = await this.fetchSvc.fetch("/api/v1/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query,
        }),
      });

      const peopleJson = await res.json();

      if (peopleJson) {
        this.people = peopleJson.map((p: GoogleUser) => {
          return {
            email: p.emailAddresses[0]?.value,
            imgURL: p.photos?.[0]?.url,
          };
        });
      } else {
        this.people = [];
      }
    } catch (err) {
      console.log(`Error querying people: ${err}`);
      throw err;
    }
  });
}
