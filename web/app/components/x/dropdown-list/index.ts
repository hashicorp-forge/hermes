import { assert } from "@ember/debug";
import { action } from "@ember/object";
import { schedule } from "@ember/runloop";
import { inject as service } from "@ember/service";
import { OffsetOptions, Placement } from "@floating-ui/dom";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { restartableTask, task } from "ember-concurrency";
import ActiveFiltersService from "hermes/services/active-filters";
import FetchService from "hermes/services/fetch";

interface XDropdownListComponentSignature {
  Element: HTMLDivElement;
  Args: {
    items?: any;
    label?: string;
    teams?: any;
    listIsOrdered?: boolean;
    selected?: any;
    placement?: Placement;
    isSaving?: boolean;
    offset?: OffsetOptions;
    renderOut?: boolean;
    onItemClick: (value: any, attributes: any) => void;
  };
  // TODO: Replace using Glint's `withBoundArgs` types
  Blocks: {
    default: [];
    anchor: [dd: any];
    header: [dd: any];
    item: [dd: any];
  };
}

export enum FocusDirection {
  Previous = "previous",
  Next = "next",
  First = "first",
  Last = "last",
}

export default class XDropdownListComponent extends Component<XDropdownListComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service declare activeFilters: ActiveFiltersService;

  @tracked private _scrollContainer: HTMLElement | null = null;
  @tracked private _input: HTMLInputElement | null = null;
  @tracked private _filteredItems: unknown | null = null;
  @tracked private _menuItems: NodeListOf<Element> | null = null;

  @tracked protected query: string = "";
  @tracked protected listItemRole = this.inputIsShown ? "option" : "menuitem";
  @tracked protected focusedItemIndex = -1;

  /**
   * An asserted-true reference to the scroll container.
   */
  private get scrollContainer(): HTMLElement {
    assert("_scrollContainer must exist", this._scrollContainer);
    return this._scrollContainer;
  }

  /**
   * An asserted-true reference to the filter input.
   */
  get input() {
    assert("input must exist", this._input);
    return this._input;
  }

  /**
   * Whether the dropdown has a filter input.
   * Used to determine layout configurations and
   * aria-roles for various elements.
   */
  get inputIsShown() {
    if (!this.args.items) {
      return false;
    } else {
      return Object.keys(this.args.items).length > 7;
    }
  }

  findCommonStrings(arr1: string[], arr2: string[]): string[] {
    const commonStrings: string[] = [];

    for (const str of arr1) {
      if (arr2.includes(str)) {
        commonStrings.push(str);
      }
    }

    return commonStrings;
  }

  // Function to retrieve all teams under specific BUs
  getTeamsByBUs(jsonData: { [key: string]: any }, bus: string[]): string[] {
    const teams: string[] = [];

    for (const key in jsonData) {
      if (jsonData.hasOwnProperty(key)) {
        const team = jsonData[key];
        if (bus.includes(team.BU) && team.projects) {
          teams.push(key);
        }
      }
    }

    return teams;
  }
  // Function to retrieve projects under specific BUs
  // Function to retrieve project keys under specific BUs
  getProjectsByBUs(
    jsonData: { [key: string]: any },
    targetBUs: string[]
  ): string[] {
    const projectKeys: string[] = [];

    for (const key in jsonData) {
      if (jsonData.hasOwnProperty(key)) {
        const team = jsonData[key];
        if (targetBUs.includes(team.BU) && team.projects) {
          projectKeys.push(...Object.keys(team.projects));
        }
      }
    }

    return projectKeys;
  }
  // Function to retrieve projects under specific team names
  getProjectsByTeams(
    jsonData: { [key: string]: any },
    targetTeams: string[]
  ): string[] {
    const projectKeys: string[] = [];

    for (const key in jsonData) {
      if (jsonData.hasOwnProperty(key) && targetTeams.includes(key)) {
        const team = jsonData[key];
        if (team.projects) {
          projectKeys.push(...Object.keys(team.projects));
        }
      }
    }

    return projectKeys;
  }

  getValidBUs() {
    // Extract distinct BU values as an array of strings
    let distinctBUs: string[] = Object.values(this.args.teams)
      .map((item: any) => item.BU)
      .filter((value, index, self) => self.indexOf(value) === index);
    let filteredBUs = this.findCommonStrings(distinctBUs, this.shownFilters);
    return filteredBUs;
  }
  getValidTeams() {
    let distinctTeams: string[] = Object.keys(this.args.teams);
    let filteredTeams = this.findCommonStrings(
      distinctTeams,
      this.shownFilters
    );
    return filteredTeams;
  }

  // Function to filter and keep specific keys from the JSON object
  filterKeysFromJSON(
    jsonData: { [key: string]: any },
    keysToKeep: string[]
  ): { [key: string]: any } {
    const filteredData: { [key: string]: any } = {};

    for (const key of keysToKeep) {
      if (jsonData.hasOwnProperty(key)) {
        filteredData[key] = jsonData[key];
      }
    }

    return filteredData;
  }

  allowedTeams(resultShownItems: any) {
    let filteredBUs = this.getValidBUs();
    const teamsUnderBUs: string[] = this.getTeamsByBUs(
      this.args.teams,
      filteredBUs
    );
    const filteredData: { [key: string]: any } = this.filterKeysFromJSON(
      resultShownItems,
      teamsUnderBUs
    );
    // Check if filteredData is empty
    const isEmpty: boolean = Object.keys(filteredData).length === 0;
    if (!isEmpty) {
      resultShownItems = filteredData;
    }
    return resultShownItems;
  }

  allowedProjects(resultShownItems: any) {
    let filteredTeams = this.getValidTeams();
    let filteredBUs = this.getValidBUs();

    let projectsUnderBUs = this.getProjectsByBUs(this.args.teams, filteredBUs);
    let projectsUnderTeams: string[] = this.getProjectsByTeams(
      this.args.teams,
      filteredTeams
    );
    const filteredDataForProjectUnderTeams: { [key: string]: any } =
      this.filterKeysFromJSON(resultShownItems, projectsUnderTeams);
    const filteredDataForProjectUnderBUs: { [key: string]: any } =
      this.filterKeysFromJSON(resultShownItems, projectsUnderBUs);

    // Check if filteredDataForProjectUnderTeams is empty
    const isEmptyForProjectUnderTeams: boolean =
      Object.keys(filteredDataForProjectUnderTeams).length === 0;
    // Check if filteredDataForProjectUnderBUs is empty
    const isEmptyForProjectUnderBUs: boolean =
      Object.keys(filteredDataForProjectUnderBUs).length === 0;
    if (!isEmptyForProjectUnderTeams) {
      resultShownItems = filteredDataForProjectUnderTeams;
    } else if (!isEmptyForProjectUnderBUs) {
      resultShownItems = filteredDataForProjectUnderBUs;
    }
    return resultShownItems;
  }

  /**
   * The items that should be shown in the dropdown.
   * Initially the same as the items passed in and
   * updated when the user types in the filter input.
   */
  get shownItems() {
    let resultShownItems = this._filteredItems || this.args.items;
    let label = this.args.label;
    if (label == "Team") {
      resultShownItems = this.allowedTeams(resultShownItems);
    }
    if (label == "Project") {
      resultShownItems = this.allowedProjects(resultShownItems);
    }
    return resultShownItems;
  }

  get shownFilters() {
    return Object.values(this.activeFilters.index).flat();
  }

  /**
   * The action run when the scrollContainer is inserted.
   * Registers the div for reference locally.
   */
  @action protected registerScrollContainer(element: HTMLDivElement) {
    this._scrollContainer = element;
  }

  /**
   * The action performed when the filter input is inserted.
   * Registers the input locally and focuses it for the user.
   */
  @action registerAndFocusInput(e: HTMLInputElement) {
    this._input = e;

    /**
     * The dropdown is initially positioned in the top of page-body,
     * so we specify that the focus event should not scroll to it.
     * Instead, we use FloatingUI to place the input in view.
     */
    this.input.focus({ preventScroll: true });
  }

  /**
   * The action run when the content div is inserted.
   * Used to assign ids to the menu items.
   */
  @action protected didInsertContent() {
    assert(
      "didInsertContent expects a _scrollContainer",
      this._scrollContainer
    );
    this.assignMenuItemIDs(
      this._scrollContainer.querySelectorAll(`[role=${this.listItemRole}]`)
    );
  }

  @action onDestroy() {
    this.query = "";
    this._filteredItems = null;
    this.resetFocusedItemIndex();
  }

  /**
   * The action run when the content div is destroyed.
   * Resets the filtered items so that the next time the
   * popover is opened, the full list of items is shown.
   */
  @action resetFilteredItems() {
    this._filteredItems = null;
  }

  /**
   * The action run when the popover is inserted, and when
   * the user filters or navigates the dropdown.
   * Loops through the menu items and assigns an id that
   * matches the index of the item in the list.
   */
  @action assignMenuItemIDs(items: NodeListOf<Element>): void {
    this._menuItems = items;
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      assert("item must exist", item instanceof HTMLElement);
      item.id = `x-dropdown-list-item-${i}`;
    }
  }

  /**
   * The action run when the trigger is focused and the user
   * presses the up or down arrow keys. Used to open and focus
   * to the first or last item in the dropdown.
   */
  @action protected onTriggerKeydown(
    contentIsShown: boolean,
    showContent: () => void,
    event: KeyboardEvent
  ) {
    if (contentIsShown) {
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      showContent();

      // Prevent the event from bubbling to the contentBody's keydown listener.
      event.stopPropagation();

      // Wait for menuItemIDs to be set by `didInsertContent`.
      schedule("afterRender", () => {
        switch (event.key) {
          case "ArrowDown":
            this.setFocusedItemIndex(FocusDirection.First, false);
            break;
          case "ArrowUp":
            this.setFocusedItemIndex(FocusDirection.Last);
            break;
        }
      });
    }
  }

  /**
   * Sets the focus to the next or previous menu item.
   * Used by the onKeydown action to navigate the dropdown, and
   * by the FacetDropdownListItem component on mouseenter.s
   */
  @action protected setFocusedItemIndex(
    focusDirectionOrNumber: FocusDirection | number,
    maybeScrollIntoView = true
  ) {
    let { _menuItems: menuItems, focusedItemIndex } = this;

    let setFirst = () => {
      focusedItemIndex = 0;
    };

    let setLast = () => {
      assert("menuItems must exist", menuItems);
      focusedItemIndex = menuItems.length - 1;
    };

    if (!menuItems) {
      return;
    }

    if (menuItems.length === 0) {
      return;
    }

    switch (focusDirectionOrNumber) {
      case FocusDirection.Previous:
        if (focusedItemIndex === -1 || focusedItemIndex === 0) {
          // When the first or no item is focused, "previous" focuses the last item.
          setLast();
        } else {
          focusedItemIndex--;
        }
        break;
      case FocusDirection.Next:
        if (focusedItemIndex === menuItems.length - 1) {
          // When the last item is focused, "next" focuses the first item.
          setFirst();
        } else {
          focusedItemIndex++;
        }
        break;
      case FocusDirection.First:
        setFirst();
        break;
      case FocusDirection.Last:
        setLast();
        break;
      default:
        focusedItemIndex = focusDirectionOrNumber;
        break;
    }

    this.focusedItemIndex = focusedItemIndex;

    if (maybeScrollIntoView) {
      this.maybeScrollIntoView();
    }
  }

  /**
   * Checks whether the focused item is completely visible,
   * and, if necessary, scrolls the dropdown to make it visible.
   * Used by the setFocusedItemIndex action on keydown.
   */
  private maybeScrollIntoView() {
    const focusedItem = this._menuItems?.item(this.focusedItemIndex);
    assert("focusedItem must exist", focusedItem instanceof HTMLElement);

    const containerHeight = this.scrollContainer.offsetHeight;
    const itemHeight = focusedItem.offsetHeight;
    const itemTop = focusedItem.offsetTop;
    const itemBottom = focusedItem.offsetTop + itemHeight;
    const scrollviewTop = this.scrollContainer.scrollTop;
    const scrollviewBottom = scrollviewTop + containerHeight;

    if (itemBottom > scrollviewBottom) {
      this.scrollContainer.scrollTop = itemTop + itemHeight - containerHeight;
    } else if (itemTop < scrollviewTop) {
      this.scrollContainer.scrollTop = itemTop;
    }
  }

  /**
   * Sets the focusItemIndex to -1.
   * Called onInput and when the popover is closed.
   */
  @action protected resetFocusedItemIndex() {
    this.focusedItemIndex = -1;
  }

  /**
   * The action run when the user types in the input.
   * Filters the facets shown in the dropdown and schedules
   * the menu items to be assigned their new IDs.
   */
  protected onInput = restartableTask(async (inputEvent: InputEvent) => {
    this.resetFocusedItemIndex();

    let shownItems: any = {};
    let { items } = this.args;

    this.query = (inputEvent.target as HTMLInputElement).value;
    for (const [key, value] of Object.entries(items)) {
      if (key.toLowerCase().includes(this.query.toLowerCase())) {
        shownItems[key] = value;
      }
    }

    this._filteredItems = shownItems;
    this.scheduleAssignMenuItemIDs();
  });

  /**
   * The action that assigns menu item IDs.
   * Scheduled after render to ensure that the menu items
   * have been rendered and are available to query, including
   * after being filtered.
   *
   * In cases where items are loaded asynchronously,
   * e.g., when querying Algolia, the menu items are not
   * available immediately after render. In these cases,
   * the component should call `scheduleAssignMenuItemIDs`
   * in the `next` runloop.
   */
  @action protected scheduleAssignMenuItemIDs() {
    schedule("afterRender", () => {
      assert(
        "scheduleAssignMenuItemIDs expects a _scrollContainer",
        this._scrollContainer
      );
      this.assignMenuItemIDs(
        this._scrollContainer.querySelectorAll(`[role=${this.listItemRole}]`)
      );
    });
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "X::DropdownList": typeof XDropdownListComponent;
  }
}
