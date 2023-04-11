import { assert } from "@ember/debug";
import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

interface XHdsDropdownListSignature<T> {
  Args: {
    items: any;
    isOrdered?: boolean;
    onChange: (e: Event) => void;
    resetFocusedItemIndex: () => void;
    registerScrollContainer?: (e: HTMLElement) => void;
  };
}

export default class XHdsDropdownList extends Component<
  XHdsDropdownListSignature<any>
> {
  @tracked _input: HTMLInputElement | null = null;

  get inputIsShown() {
    return Object.keys(this.args.items).length > 7;
  }

  get input() {
    assert("input must exist", this._input);
    return this._input;
  }

  @action registerAndFocusInput(e: HTMLInputElement) {
    this._input = e;
    this.input.focus();
  }
}
