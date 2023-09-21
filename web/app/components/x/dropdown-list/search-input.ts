import { assert } from "@ember/debug";
import { action } from "@ember/object";
import { next } from "@ember/runloop";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

interface XDropdownListSearchInputComponentSignature {
  Element: HTMLInputElement;
  Args: {
    registerAnchor: (anchor: HTMLInputElement) => void;
    ariaControls: string;
    contentIsShown?: boolean;
    onKeydown?: (event: KeyboardEvent) => void;
    onInput?: (event: Event) => void;
    searchIsRunning?: boolean;
    inputPlaceholder?: string;
    query?: string;
  };
  Blocks: {
    default: [];
  };
}

export default class XDropdownListSearchInputComponent extends Component<XDropdownListSearchInputComponentSignature> {
  @tracked protected keyboardNavIsEnabled = true;

  @action protected didInsertInput(element: HTMLInputElement) {
    this.args.registerAnchor(element);

    next(() => {
      element.focus();
    });
  }

  @action protected onInput(event: Event) {
    if (!this.keyboardNavIsEnabled) {
      return;
    }
    assert("this.args.onInput must exist", this.args.onInput);
    this.args.onInput(event);
  }

  @action protected onKeydown(event: KeyboardEvent) {
    if (!this.keyboardNavIsEnabled) {
      return;
    }
    assert("this.args.onKeydown must exist", this.args.onKeydown);
    this.args.onKeydown(event);
  }

  @action protected enableKeyboardNav() {
    this.keyboardNavIsEnabled = true;
  }

  @action protected disableKeyboardNav() {
    this.keyboardNavIsEnabled = false;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "x/dropdown-list/search-input": typeof XDropdownListSearchInputComponent;
  }
}
