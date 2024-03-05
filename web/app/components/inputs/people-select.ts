import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import { restartableTask, timeout } from "ember-concurrency";
import { action } from "@ember/object";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import Ember from "ember";
import StoreService from "hermes/services/store";
import PersonModel from "hermes/models/person";
import calculatePosition from "ember-basic-dropdown/utils/calculate-position";
import PowerSelectMultiple, {
  PowerSelectMultipleArgs,
} from "ember-power-select/components/power-select-multiple";
import {
  PowerSelectArgs,
  Select,
} from "ember-power-select/components/power-select";
import { next } from "@ember/runloop";

export interface GoogleUser {
  emailAddresses: { value: string }[];
  names: { displayName: string; givenName: string }[];
  photos: { url: string }[];
}

interface PeopleSelectGroup {
  groupName: string;
  options: string[];
}

interface InputsPeopleSelectComponentSignature {
  Element: HTMLDivElement;
  Args: {
    selected: string[];
    onChange: (value: string[]) => void;
    renderInPlace?: boolean;
    disabled?: boolean;
    onKeydown?: (dropdown: any, event: KeyboardEvent) => void;
  };
}

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = Ember.testing ? 0 : 500;

export default class InputsPeopleSelectComponent extends Component<InputsPeopleSelectComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare store: StoreService;

  /**
   * The list of people to display in the dropdown.
   * Instantiated empty and populated by the `searchDirectory` task.
   */
  @tracked protected people: string[] = [];
  @tracked protected groups: string[] = [];

  protected get peopleAndGroups() {
    let groups = undefined;
    let people = undefined;

    if (this.people.length > 0) {
      people = {
        groupName: "People",
        options: this.people,
      };
    }

    if (this.groups.length > 0) {
      groups = {
        groupName: "Groups",
        options: this.groups,
      };
    }

    return [people, groups].compact();
  }

  @action onClick(e: MouseEvent) {
    // check if the query is empty.
    // if it is, prevent default and stop propagation

    const target = e.target as HTMLElement;
    const input = target.closest(".ember-power-select-trigger") as HTMLElement;

    if (input) {
      const value = input.querySelector("input")?.value;
      if (value === "") {
        // Prevent EmberPowerSelect from showing a "type to search" message
        e.stopImmediatePropagation();
      }
    }
  }

  /**
   * An action occurring on every keystroke.
   * Handles cases where the user clears the input,
   * since `onChange` is not called in that case.
   * See: https://ember-power-select.com/docs/custom-search-action
   */
  @action onInput(inputValue: string, select: Select) {
    if (inputValue === "") {
      this.people = [];

      // Prevent redundant "type to search" message from appearing
      next(() => {
        select.actions.close();
      });
    }
  }

  @action onFocus(dropdown: Select) {
    if (dropdown.searchText) {
      dropdown.actions.open();
    }
  }

  /**
   * The action taken when focus leaves the component.
   * Clears the people list and calls `this.args.onBlur` if it exists.
   */
  @action onClose() {
    this.people = [];
  }

  @action calculatePosition(
    trigger: HTMLElement,
    content: HTMLElement,
    destination: HTMLElement,
    options: any,
  ) {
    const position = calculatePosition(trigger, content, destination, options);
    // this should be conditional
    position.style["min-width"] = `320px`;
    return position;
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
        const people = await this.store.query("person", {
          query,
        });

        if (people) {
          this.people = people
            .map((p: PersonModel) => p.email)
            .filter((email: string) => {
              // filter out any people already selected
              return !this.args.selected.find(
                (selectedEmail) => selectedEmail === email,
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
