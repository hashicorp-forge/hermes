import { assert } from "@ember/debug";
import { action } from "@ember/object";
import { next } from "@ember/runloop";
import { tracked } from "@glimmer/tracking";
import Modifier from "ember-modifier";
import { FOCUSABLE } from "hermes/components/editable-field";

interface AutofocusModifierSignature {
  Args: {
    Element: Element;
    Positional: [];
    Named: {
      targetChildren?: boolean;
      waitUntilNextRunloop?: boolean;
    };
  };
}

export default class AutofocusModifier extends Modifier<AutofocusModifierSignature> {
  @tracked private _element: Element | null = null;
  @tracked private targetChildren = false;

  private get element(): Element {
    assert("element must exist", this._element);
    return this._element;
  }

  @action private maybeAutofocus() {
    if (this.targetChildren) {
      const target = this.element.querySelector(FOCUSABLE);
      if (target instanceof HTMLElement) {
        target.focus();
      }
    } else {
      if (this.element instanceof HTMLElement) {
        this.element.focus();
      }
    }
  }

  modify(
    element: Element,
    _positional: [],
    named: AutofocusModifierSignature["Args"]["Named"],
  ) {
    this._element = element;
    this.targetChildren = named.targetChildren ?? false;

    if (named.waitUntilNextRunloop) {
      next(this, this.maybeAutofocus);
    } else {
      this.maybeAutofocus();
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    autofocus: typeof AutofocusModifier;
  }
}
