import Modifier from "ember-modifier";

interface AutofocusModifierSignature {
  Args: {
    Element: HTMLElement;
    Positional: [shouldAutoFocus?: boolean];
  };
}

export default class AutofocusModifier extends Modifier<AutofocusModifierSignature> {
  modify(element: HTMLElement, positional: [boolean?]) {
    if (positional[0] !== false) {
      console.log(positional[0]);
      element.focus();

      if (document.activeElement !== element) {
        element.setAttribute("tabindex", "-1");
        element.focus();
      }
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    autofocus: typeof AutofocusModifier;
  }
}
