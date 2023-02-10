import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import { task } from "ember-concurrency";
import { action } from "@ember/object";
import { assert } from "@ember/debug";

export interface Person {
  emailAddresses: { value: string }[];
  photos: { url: string }[];
}

interface PeopleSelectComponentSignature {
  Args: {
    selected: Person[];
    onBlur?: () => void;
    onChange: (people: Person[]) => void;
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
  protected searchDirectory = task(async (query: string) => {
    try {
      let fetchCall = this.fetchSvc.fetch("/api/v1/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query,
        }),
      });

      let res = await fetchCall;

      if (!res) {
        // If Google doesn't respond quickly, try one more time.
        res = await fetchCall;
      }

      assert("response must be defined", res);
      const peopleJson = await res.json();

      if (peopleJson) {
        this.people = peopleJson.map((p: Person) => {
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
