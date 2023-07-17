import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import { restartableTask, timeout } from "ember-concurrency";
import { action } from "@ember/object";
import FetchService from "hermes/services/fetch";
import { HermesUser } from "hermes/types/document";
import Ember from "ember";

export interface GoogleUser {
  emailAddresses: { value: string }[];
  photos: { url: string }[];
}

interface InputsPeopleSelectComponentSignature {
  Element: HTMLDivElement;
  Args: {
    selected: HermesUser[];
    onBlur?: () => void;
    onChange: (people: HermesUser[]) => void;
  };
}

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = Ember.testing ? 0 : 500;

export default class InputsPeopleSelectComponent extends Component<InputsPeopleSelectComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;

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
  protected searchDirectory = restartableTask(async (query: string) => {
    for (let i = 0; i < MAX_RETRIES; i++) {
      let retryDelay = INITIAL_RETRY_DELAY;

      try {
        let response = await this.fetchSvc.fetch("/api/v1/people", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query,
          }),
        });

        const peopleJson = await response?.json();

        if (peopleJson) {
          this.people = peopleJson
            .map((p: GoogleUser) => {
              return {
                email: p.emailAddresses[0]?.value,
                imgURL: p.photos?.[0]?.url,
              };
            })
            .filter((person: HermesUser) => {
              // filter out any people already selected
              return !this.args.selected.find(
                (selectedPerson) => selectedPerson.email === person.email
              );
            });
        } else {
          this.people = [];
        }
        // stop the loop if the query was successful
        return;
      } catch (e) {
        // Throw an error if this is the last retry.
        if (i === MAX_RETRIES - 1) {
          console.error(`Error querying people: ${e}`);
          throw e;
        }

        // Otherwise, wait and try again.
        await timeout(retryDelay);

        // Double the retry delay for the next retry.
        retryDelay *= 2;
      }
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::PeopleSelect": typeof InputsPeopleSelectComponent;
  }
}
