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

    // set the initial height
    this.updateHeight();

    this.element.addEventListener("input", () => {
      this.updateHeight();
    });

    registerDestructor(this, cleanup);
  }

  updateHeight() {
    const { element } = this;
    assert("element must exist", element);

    const offset = element.offsetHeight - element.clientHeight;

    // ensure the correct height in the case of deleted text:
    element.style.height = "auto";

    element.style.height = element.scrollHeight + offset + "px";
  }
}
