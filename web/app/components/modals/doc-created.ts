import { action } from "@ember/object";
import Component from "@glimmer/component";
import window from "ember-window-mock";

interface ModalsDocCreatedComponentSignature {
  Args: {
    close: () => void;
  };
}

export default class ModalsDocCreatedComponent extends Component<ModalsDocCreatedComponentSignature> {
  get localStorageSetting(): string | null {
    return window.localStorage.getItem("docCreatedModalIsHidden");
  }

  checkboxClicked = false;

  get modalIsShown(): boolean {
    if (this.localStorageSetting) {
      return false;
    } else {
      return true;
    }
  }

  @action close() {
    if (this.checkboxClicked) {
      window.localStorage.setItem("docCreatedModalIsHidden", "true");
    }
    this.args.close();
  }

  @action toggleChecked() {
    this.checkboxClicked = !this.checkboxClicked;
  }
}
