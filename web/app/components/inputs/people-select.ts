import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import { action } from "@ember/object";
import { debounce } from "@ember/runloop";
import Ember from "ember";
import type ConfigService from "hermes/services/config";
import type StoreService from "hermes/services/store";
import type PersonModel from "hermes/models/person";
import type GroupModel from "hermes/models/group";
import type AuthenticatedUserService from "hermes/services/authenticated-user";

interface InputsPeopleSelectComponentSignature {
  Element: HTMLDivElement;
  Args: {
    selected: string[];
    onChange: (value: string[]) => void;
    renderInPlace?: boolean;
    disabled?: boolean;
    includeGroups?: boolean;
    isSingleSelect?: boolean;
    excludeSelf?: boolean;
    triggerId?: string;
  };
}

const DEBOUNCE_MS = Ember.testing ? 0 : 300;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = Ember.testing ? 0 : 500;

export default class InputsPeopleSelectComponent extends Component<InputsPeopleSelectComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare store: StoreService;

  @tracked searchQuery = "";
  @tracked searchResults: string[] = [];
  @tracked showDropdown = false;
  @tracked isSearching = false;
  @tracked focusedIndex = -1;
  @tracked dropdownElement: HTMLElement | null = null;

  @action
  setupDropdown(element: HTMLElement) {
    this.dropdownElement = element;
  }

  @action
  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
    
    if (this.searchQuery.trim().length > 0) {
      this.showDropdown = true;
      debounce(this, this.performSearch, DEBOUNCE_MS);
    } else {
      this.showDropdown = false;
      this.searchResults = [];
    }
  }

  @action
  onFocus() {
    // Show dropdown on focus if there's a query
    if (this.searchQuery.trim().length > 0) {
      this.showDropdown = true;
    }
  }

  @action
  onBlur() {
    // Delay to allow click events to fire
    setTimeout(() => {
      this.showDropdown = false;
      // Clear search query when dropdown closes
      this.searchQuery = "";
      this.searchResults = [];
    }, 200);
  }

  @action
  onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      this.showDropdown = false;
      this.searchQuery = "";
      this.focusedIndex = -1;
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (this.showDropdown && this.searchResults.length > 0) {
        this.focusedIndex = Math.min(
          this.focusedIndex + 1,
          this.searchResults.length - 1
        );
        this.scrollToFocusedOption();
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (this.showDropdown && this.searchResults.length > 0) {
        this.focusedIndex = Math.max(this.focusedIndex - 1, 0);
        this.scrollToFocusedOption();
      }
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selectedOption = this.searchResults[this.focusedIndex];
      if (this.focusedIndex >= 0 && selectedOption) {
        this.selectOption(selectedOption);
      }
    }
  }

  @action
  async performSearch() {
    const query = this.searchQuery.trim();
    if (!query) {
      this.searchResults = [];
      this.focusedIndex = -1;
      return;
    }

    this.isSearching = true;

    try {
      const results = await this.doDirectorySearch(query);
      this.searchResults = results;
      this.focusedIndex = -1;
    } catch (error) {
      this.searchResults = [];
      this.focusedIndex = -1;
    } finally {
      this.isSearching = false;
    }
  }

  @action
  selectOption(email: string) {
    const newSelected = [...this.args.selected, email];
    this.args.onChange(newSelected);
    
    // Clear search and close dropdown
    this.searchQuery = "";
    this.searchResults = [];
    this.showDropdown = false;
    this.focusedIndex = -1;
  }

  @action
  removeSelection(email: string) {
    const newSelected = this.args.selected.filter(e => e !== email);
    this.args.onChange(newSelected);
  }

  @action
  onMouseEnter(index: number) {
    this.focusedIndex = index;
  }

  private scrollToFocusedOption() {
    // Scroll the focused option into view
    const dropdown = this.dropdownElement;
    const focusedOption = dropdown?.querySelector(`[data-option-index="${this.focusedIndex}"]`);
    if (focusedOption && dropdown) {
      const dropdownRect = dropdown.getBoundingClientRect();
      const optionRect = focusedOption.getBoundingClientRect();
      
      if (optionRect.bottom > dropdownRect.bottom) {
        focusedOption.scrollIntoView({ block: 'nearest' });
      } else if (optionRect.top < dropdownRect.top) {
        focusedOption.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  private async doDirectorySearch(query: string): Promise<string[]> {
    for (let i = 0; i < MAX_RETRIES; i++) {
      let retryDelay = INITIAL_RETRY_DELAY;

      try {
        let promises: Promise<any>[] = [this.store.query("person", { query })];

        if (this.args.includeGroups) {
          promises.push(this.store.query("group", { query }));
        }

        const results = await Promise.allSettled(promises);
        const peopleResult = results[0];
        const groupsResult = results[1];

        if (!peopleResult || peopleResult.status === "rejected") {
          throw peopleResult?.reason ?? new Error("Unable to search people");
        }

        const people = peopleResult.value;
        const groups = groupsResult?.status === "fulfilled" ? groupsResult.value : undefined;

        let p: string[] = [];
        let g: string[] = [];

        if (people) {
          p = people
            .map((person: PersonModel) => person.email)
            .filter((email: string) => {
              // Filter out already selected
              return !this.args.selected.includes(email);
            })
            .filter((email: string) => {
              // Filter out authenticated user if excludeSelf is true
              return (
                !this.args.excludeSelf ||
                email !== this.authenticatedUser.info.email
              );
            });
        }

        if (groups) {
          g = groups
            .filter((group: GroupModel) => {
              const name = group.name.toLowerCase();
              return !name.includes("departed") && !name.includes("terminated");
            })
            .map((group: GroupModel) => group.email)
            .filter((email: string) => {
              return !this.args.selected.includes(email);
            });
        }

        // Concatenate and sort
        return [...p, ...g].sort((a, b) => a.localeCompare(b));
      } catch (error) {
        if (i === MAX_RETRIES - 1) {
          throw error;
        }

        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retryDelay *= 2;
      }
    }

    return [];
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::PeopleSelect": typeof InputsPeopleSelectComponent;
  }
}