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
      dismiss: () => void;
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
  /**
   * Register the cleanup function for when the modifier is destroyed.
   */
  constructor(owner: any, args: ArgsFor<DismissibleModifierSignature>) {
    super(owner, args);
    registerDestructor(this, cleanup);
  }

  @tracked private _element: HTMLElement | null = null;
  @tracked private _dismiss?: () => void;
  @tracked private related?: HTMLElement | HTMLElement[];

  get element(): HTMLElement {
    assert("_element must exist", this._element);
    return this._element;
  }

  get dismiss(): () => void {
    assert("_dismiss must exist", this._dismiss);
    return this._dismiss;
  }

  /**
   * Whether the target is related to the dismissible element.
   * Used to prevent dismissing when targeting on a related element
   * that isn't a child of the dismissible element.
   */
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

  /**
   * The function to call when the user clicks/focuses/keys on the document.
   * Will dismiss the element if it or its relatives don't contain the target.
   * Will dismiss on Escape unless the target is a search input with a value,
   * in which case we preserve the search's "clear" function.
   */
  @action maybeDismiss(event: FocusEvent | PointerEvent | KeyboardEvent) {
    if (event instanceof KeyboardEvent) {
      if (event.key === "Escape") {
        let activeElement = document.activeElement;
        if (
          activeElement?.attributes.getNamedItem("type")?.value === "search"
        ) {
          if ((activeElement as HTMLInputElement).value !== "") {
            return;
          }
        }
        this.dismiss();
      }
      return;
    } else {
      let target = event.target as HTMLElement;
      if (!this.element.contains(target)) {
        if (!this.targetIsRelated(target, this.related)) {
          this.dismiss();
        }
      }
    }
  }

  /**
   * The function that runs when the modified element is shown.
   * Sets up the event listeners and stores the properties locally.
   */
  modify(
    element: HTMLElement,
    _positional: [],
    named: {
      dismiss: () => void;
      related?: HTMLElement | HTMLElement[];
    }
  ) {
    this._element = element;
    this._dismiss = named.dismiss;
    this.related = named.related;
    document.addEventListener("focusin", this.maybeDismiss);
    document.addEventListener("click", this.maybeDismiss);
    document.addEventListener("keydown", this.maybeDismiss);
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    dismissible: typeof DismissibleModifier;
  }
}
