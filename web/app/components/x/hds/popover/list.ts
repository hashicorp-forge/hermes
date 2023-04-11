import { assert } from "@ember/debug";
import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

interface XHdsPopoverListSignature {
  Args: {
    items: string[];
    resetFocusedItemIndex: () => void;
  };
}

export default class XHdsPopoverList extends Component<XHdsPopoverListSignature> {
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
