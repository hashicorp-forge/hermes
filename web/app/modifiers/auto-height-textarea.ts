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
    this.updateHeight();

    // do we need to do an `onInput` on insert?

    this.element.addEventListener("input", () => {
      this.updateHeight();
    });

    registerDestructor(this, cleanup);
  }

  updateHeight() {
    assert("element must exist", this.element);

    let offset = this.element.offsetHeight - this.element.clientHeight;

    this.element.style.height = "auto";
    this.element.style.height = this.element.scrollHeight + offset + "px";
  }
}
