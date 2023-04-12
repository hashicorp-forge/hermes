import { assert } from "@ember/debug";
import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { FocusDirection } from ".";

interface XHdsDropdownListSignature<T> {
  Args: {
    items?: any;
    shownItems: any;
    selected: any;
    inputIsShown?: boolean;
    isOrdered?: boolean;
    onChange: (e: Event) => void;
    resetFocusedItemIndex: () => void;
    registerScrollContainer?: (e: HTMLElement) => void;
    setFocusedItemIndex: (direction: FocusDirection) => void;
    f: any;
  };
}

export default class XHdsDropdownList extends Component<
  XHdsDropdownListSignature<any>
> {
  @tracked _input: HTMLInputElement | null = null;

  get input() {
    assert("input must exist", this._input);
    return this._input;
  }

  protected get noMatchesFound(): boolean {
    if (!this.args.inputIsShown) {
      return false;
    }
    return Object.entries(this.args.shownItems).length === 0;
  }

  @action registerAndFocusInput(e: HTMLInputElement) {
    this._input = e;
    this.input.focus();
  }

  @action protected maybeKeyboardNavigate(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.args.setFocusedItemIndex(FocusDirection.Next);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.args.setFocusedItemIndex(FocusDirection.Previous);
    }

    if (event.key === "Enter") {
      event.preventDefault();
      assert("floatingUI content must exist", this.args.f.content);
      const target = this.args.f.content.querySelector("[aria-selected]");

      if (
        target instanceof HTMLAnchorElement ||
        target instanceof HTMLButtonElement
      ) {
        target.click();
        this.args.f.hideContent();
      }
    }
  }
}
