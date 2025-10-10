import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { service } from "@ember/service";
import { restartableTask, timeout } from "ember-concurrency";
import { action } from "@ember/object";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import { isTesting } from "@embroider/macros";
import StoreService from "hermes/services/store";
import PersonModel from "hermes/models/person";
import { Select } from "ember-power-select/components/power-select";
import { next, schedule } from "@ember/runloop";
import calculatePosition from "ember-basic-dropdown/utils/calculate-position";
import GroupModel from "hermes/models/group";
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
    includeGroups?: boolean;
    onKeydown?: (dropdown: any, event: KeyboardEvent) => void;

    /**
     * Whether the dropdown should be single-select.
     * When true, will not show the dropdown when there's a selection.
     */
    isSingleSelect?: boolean;

    /**
     * Whether to exclude the authenticated user from the dropdown.
     * Used by the "Transfer ownership" modal, where suggesting the
     * authenticated user as a new owner would be unhelpful.
     */
    excludeSelf?: boolean;

    /**
     * The ID of the EmberPowerSelect trigger. Allows the label
     * to be associated with the input for accessibility purposes.
     */
    triggerId?: string;
  };
}

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = isTesting() ? 0 : 500;

export default class InputsPeopleSelectComponent extends Component<InputsPeopleSelectComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare store: StoreService;

  /**
   * The list of people to display in the dropdown.
   * Instantiated empty and populated by the `searchDirectory` task.
   */
  @tracked protected options: string[] = [];

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

  /**
   * The action to run when the PowerSelect input is focused and a key is pressed.
   * On Enter, ArrowDown, and ArrowUp, prevents the dropdown from opening in a
   * useless state (e.g., "Type to search").
   */
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
      this.options = [];

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
    this.options = [];
  }
  /**
   * The action to maybe close the dropdown. Passed to the PeopleSelect
   * as `onOpen`. If the dropdown is single-select and has a selection, i.e.,
   * when there's nothing to show in the dropdown, it closes the dropdown.
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

    const extraOffsetLeft = 2;
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
   * Includes a 250ms debounce to prevent rapid cancellations from quick typing.
   */
  protected searchDirectory = restartableTask(async (query: string) => {
    console.log('[PeopleSelect] 🔍 searchDirectory task started', { query, includeGroups: this.args.includeGroups, hasStore: !!this.store });
    
    // Debounce: wait 250ms before starting the search to prevent rapid cancellations
    console.log('[PeopleSelect] ⏱️ Debouncing for 250ms...');
    await timeout(250);
    console.log('[PeopleSelect] ✅ Debounce complete, proceeding with search');
    
    if (!this.store) {
      console.error('[PeopleSelect] ❌ ERROR: this.store is undefined!');
      return;
    }
    
    for (let i = 0; i < MAX_RETRIES; i++) {
      let retryDelay = INITIAL_RETRY_DELAY;

      let p: string[] = [];
      let g: string[] = [];

      /**
       * WORKAROUND: Directly call adapter methods instead of Store.query()
       * to avoid Ember Data 4.12 RequestManager initialization issues.
       * See web/app/services/_store.ts maybeFetchPeople for same workaround.
       */
      const personAdapter = this.store.adapterFor("person" as never) as any;
      
      const promises = [
        personAdapter.query(this.store, this.store.modelFor("person"), { query }),
      ];

      try {
        if (this.args.includeGroups) {
          const groupAdapter = this.store.adapterFor("group" as never) as any;
          promises.push(groupAdapter.query(this.store, this.store.modelFor("group"), { query }));
        }

        const [peopleResponse, groupsResponse] = await Promise.all(promises);
        
        // Unwrap adapter responses (adapters return { results: [...] })
        const people = peopleResponse?.results;
        const groups = groupsResponse?.results;

        if (people) {
          p = people
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
                email !== this.authenticatedUser.info?.email
              );
            });
        } else {
          p = [];
        }

        if (groups) {
          g = groups
            .filter((g: GroupModel) => {
              const name = g.name.toLowerCase();
              if (name.includes("departed") || name.includes("terminated")) {
                return false;
              } else {
                return true;
              }
            })
            .map((g: GroupModel) => g.email)
            .filter((email: string) => {
              // Filter out any people already selected
              return !this.args.selected.find(
                (selectedEmail) => selectedEmail === email,
              );
            });
        } else {
          g = [];
        }

        // Concatenate and sort alphabetically
        this.options = [...p, ...g].sort((a, b) => a.localeCompare(b));
        console.log('[PeopleSelect] ✅ Search complete', { totalResults: this.options.length, people: p.length, groups: g.length });

        // Stop the loop if the query was successful
        return;
      } catch (e) {
        console.error('[PeopleSelect] ❌ Error on attempt', i + 1, ':', e);
        // Throw an error if this is the last retry.
        if (i === MAX_RETRIES - 1) {
          console.error(`[PeopleSelect] 💥 All retries exhausted. Final error: ${e}`);
          throw e;
        } else {
          console.log('[PeopleSelect] 🔄 Retrying after', retryDelay, 'ms delay...');
        }

        // Otherwise, wait and try again.
        await timeout(retryDelay);

        // Double the retry delay for the next retry.
        retryDelay *= 2;
      }
    }
    console.log('[PeopleSelect] 🏁 searchDirectory task completed');
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::PeopleSelect": typeof InputsPeopleSelectComponent;
  }
}
