import Modifier from "ember-modifier";
import { registerDestructor } from "@ember/destroyable";

function cleanup(instance: SelectOnFocusModifier) {
  let { element } = instance;

  if (element) {
    element.removeEventListener("focus", () => {
      instance._select();
    });

    instance.element = null;
  }
}

export default class SelectOnFocusModifier extends Modifier {
  element: HTMLInputElement | null = null;

  modify(element: HTMLInputElement) {
    this.element = element;

    this.element.addEventListener("focus", () => {
      this._select();
    });

    registerDestructor(this, cleanup);
  }

  _select() {
    const { element } = this;

    if (element) {
      element.select();
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "select-on-focus": typeof SelectOnFocusModifier;
  }
}
