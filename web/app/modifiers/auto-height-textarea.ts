import { assert } from "@ember/debug";
import { registerDestructor } from "@ember/destroyable";
import Modifier from "ember-modifier";

interface AutoHeightTextareaModifierSignature {
  Args: {
    Positional: [];
    Named: {};
  };
}

function cleanup(instance: AutoHeightTextareaModifier) {
  let { element } = instance;

  if (element) {
    element.removeEventListener("input", () => {
      instance.updateHeight();
    });

    instance.element = null;
  }
}

export default class AutoHeightTextareaModifier extends Modifier<AutoHeightTextareaModifierSignature> {
  element: HTMLTextAreaElement | null = null;

  modify(element: HTMLTextAreaElement) {
    this.element = element;

    this.element.setAttribute("rows", "1");
    this.element.style.resize = "none";
    this.element.style.overflow = "hidden";

    // set initial height
    this.updateHeight();

    this.element.addEventListener("input", () => {
      this.updateHeight();
    });

    registerDestructor(this, cleanup);
  }

  updateHeight() {
    const { element } = this;
    assert("element must exist", element);

    // measure any strokes
    const offset = element.offsetHeight - element.clientHeight;

    // temporarily set the textarea's height to 0 to force a scrollHeight
    element.style.height = "0";

    // set the height to the scrollHeight + offset
    element.style.height = element.scrollHeight + offset + "px";
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "auto-height-textarea": typeof AutoHeightTextareaModifier;
  }
}
