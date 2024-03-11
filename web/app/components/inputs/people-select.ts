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
import { Select } from "ember-power-select/components/power-select";
import { next, schedule } from "@ember/runloop";
import calculatePosition from "ember-basic-dropdown/utils/calculate-position";
import AuthenticatedUserService from "hermes/services/authenticated-user";

export interface GoogleUser {
  emailAddresses: { value: string }[];
  names: { displayName: string; givenName: string }[];
  photos: { url: string }[];
}

enum ComputedVerticalPosition {
  Above = "above",
  Below = "below",
}

enum ComputedHorizontalPosition {
  Left = "left",
  Right = "right",
}

interface CalculatePositionOptions {
  horizontalPosition: ComputedHorizontalPosition;
  verticalPosition: ComputedVerticalPosition;
  matchTriggerWidth: boolean;
  previousHorizontalPosition?: ComputedHorizontalPosition;
  previousVerticalPosition?: ComputedVerticalPosition;
  renderInPlace: boolean;
  dropdown: any;
}

interface InputsPeopleSelectComponentSignature {
  Element: HTMLDivElement;
  Args: {
    selected: string[];
    onChange: (value: string[]) => void;
    renderInPlace?: boolean;
    disabled?: boolean;
    onKeydown?: (dropdown: any, event: KeyboardEvent) => void;
    /**
     * Whether the dropdown should be single-select.
     * When true, will not show the dropdown when there's a selection.
     */
    isSingleSelect?: boolean;
    excludeSelf?: boolean;
    triggerId?: string;
  };
}

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = Ember.testing ? 0 : 500;

export default class InputsPeopleSelectComponent extends Component<InputsPeopleSelectComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare store: StoreService;

  /**
   * The list of people to display in the dropdown.
   * Instantiated empty and populated by the `searchDirectory` task.
   */
  @tracked protected people: string[] = [];

  /**
   * The action to run when the PowerSelect input is clicked.
   * Prevents the dropdown from opening when the input is empty.
   */
  @action protected onClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const input = target.closest(".ember-power-select-trigger") as HTMLElement;

    if (input) {
      const value = input.querySelector("input")?.value;
      if (value === "") {
        e.stopImmediatePropagation();
      }
    }
  }

  // TODO: need to prevent the dropdown from opening when the input is empty
  // and the user keys "enter", "down", or "up"
  @action protected onKeydown(dropdown: Select, event: KeyboardEvent) {
    switch (event.key) {
      case "Enter":
      case "ArrowDown":
      case "ArrowUp":
        event.stopPropagation();
        schedule("afterRender", () => {
          dropdown.actions.close();
        });
        break;
      default:
        if (this.args.onKeydown) {
          this.args.onKeydown(dropdown, event);
        }
    }
  }

  /**
   * An action occurring on every keystroke.
   * Handles cases where the user clears the input,
   * since `onChange` is not called in that case.
   * See: https://ember-power-select.com/docs/custom-search-action
   */
  @action protected onInput(inputValue: string, select: Select) {
    if (inputValue === "") {
      this.people = [];

      /**
       * Stop the redundant "type to search" message
       * from appearing when the last character is deleted.
       */
      next(() => {
        select.actions.close();
      });
    }
  }

  /**
   * The action taken when focus leaves the component.
   * Clears the people list and calls `this.args.onBlur` if it exists.
   */
  @action protected onClose() {
    this.people = [];
  }
  /**
   *
   */
  @action protected maybeClose(select: Select) {
    if (this.args.isSingleSelect && select.selected.length > 0) {
      select.actions.close();
    }
  }

  /**
   * Custom position-calculating function for the dropdown.
   * Ensures the dropdown is at least 320px wide, instead of 100% of the trigger.
   * Improves dropdown appearance when the trigger is small, e.g., in the sidebar.
   */
  @action protected calculatePosition(
    trigger: HTMLElement,
    content: HTMLElement,
    destination: HTMLElement,
    options: CalculatePositionOptions,
  ) {
    const position = calculatePosition(trigger, content, destination, options);

    const extraOffsetLeft = 4;
    const extraOffsetBelow = 2;
    const extraOffsetAbove = extraOffsetBelow + 2;

    const { verticalPosition, horizontalPosition } = position;

    let { top, left, width } = position.style;

    if (!top || !left || !width) {
      return position;
    } else {
      switch (verticalPosition) {
        case ComputedVerticalPosition.Above:
          top -= extraOffsetAbove;
          break;
        case ComputedVerticalPosition.Below:
          top += extraOffsetBelow;
          break;
      }

      switch (horizontalPosition) {
        case ComputedHorizontalPosition.Left:
          left -= extraOffsetLeft;
          break;
      }

      position.style.top = top;
      position.style.left = left;
      position.style.width = width + extraOffsetLeft * 2;
      position.style["min-width"] = `320px`;

      return position;
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
            })
            .filter((email: string) => {
              // filter the authenticated user if `excludeSelf` is true
              return (
                !this.args.excludeSelf ||
                email !== this.authenticatedUser.info.email
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
