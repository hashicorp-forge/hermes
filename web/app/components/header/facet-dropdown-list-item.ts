import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { FocusDirection } from "./facet-dropdown-list";

interface HeaderFacetDropdownListItemComponentSignature {
  Element: HTMLLIElement;
  Args: {
    currentIndex: number;
    value: string;
    count: number;
    selected: boolean;
    setFocusTo: (focusDirection: FocusDirection | number) => void;
  };
}

let ID = 0;

export default class HeaderFacetDropdownListItemComponent extends Component<HeaderFacetDropdownListItemComponentSignature> {
  @service declare router: RouterService;

  private id = ID++;

  protected get currentRouteName(): string {
    return this.router.currentRouteName;
  }

  get isFocused(): boolean {
    return this.args.currentIndex === this.id;
  }

  @action protected onMouseover(e: MouseEvent) {
    this.args.setFocusTo(this.id);
  }

  willDestroy(): void {
    ID = 0;
  }
}
