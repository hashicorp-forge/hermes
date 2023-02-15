import Modifier, { ArgsFor } from "ember-modifier";
import { registerDestructor } from "@ember/destroyable";
import { tracked } from "@glimmer/tracking";
import { assert } from "@ember/debug";
import { action } from "@ember/object";

interface DismissibleModifierSignature {
  Args: {
    Element: HTMLElement;
    Positional: [];
    Named: {
      action: () => void;
      related?: HTMLElement | HTMLElement[];
    };
  };
}

function cleanup(instance: DismissibleModifier) {
  document.removeEventListener("focusin", instance.maybeDismiss);
  document.removeEventListener("click", instance.maybeDismiss);
  document.removeEventListener("keydown", instance.maybeDismiss);
}

export default class DismissibleModifier extends Modifier<DismissibleModifierSignature> {
  @tracked private _element: HTMLElement | null = null;

  @tracked private _action?: () => void;
  @tracked private related?: HTMLElement | HTMLElement[];

  get element(): HTMLElement {
    assert("_element must exist", this._element);
    return this._element;
  }

  get action(): () => void {
    assert("_action must exist", this._action);
    return this._action;
  }

  constructor(owner: any, args: ArgsFor<DismissibleModifierSignature>) {
    super(owner, args);
    registerDestructor(this, cleanup);
  }

  targetIsRelated(target: HTMLElement, related?: HTMLElement | HTMLElement[]) {
    if (related instanceof HTMLElement) {
      if (related.contains(target)) {
        return true;
      }
    }

    if (related instanceof Array) {
      for (let element of related) {
        if (element.contains(target)) {
          return true;
        }
      }
    }

    return false;
  }

  @action maybeDismiss(event: FocusEvent | PointerEvent | KeyboardEvent) {
    console.log("event", event);
    if (event instanceof KeyboardEvent) {
      if (event.key === "Escape") {
        this.action();
      }
      return;
    } else {
      let target = event.target as HTMLElement;
      if (!this.element.contains(target)) {
        if (!this.targetIsRelated(target, this.related)) {
          this.action();
        }
      }
    }
  }

  modify(
    element: HTMLElement,
    _positional: [],
    named: {
      action: () => void;
      related?: HTMLElement | HTMLElement[];
    }
  ) {
    this._element = element;
    this._action = named.action;
    this.related = named.related;

    document.addEventListener("focusin", this.maybeDismiss);
    document.addEventListener("click", this.maybeDismiss);
    document.addEventListener("keydown", this.maybeDismiss);
  }
}
