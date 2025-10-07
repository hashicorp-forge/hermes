import { action } from "@ember/object";
import Component from "@glimmer/component";
import { isTesting } from "@embroider/macros";
import window from "ember-window-mock";

interface ModalsDraftCreatedComponentSignature {
  Args: {
    close: () => void;
  };
}

export const DRAFT_CREATED_LOCAL_STORAGE_KEY = isTesting()
  ? "test-docCreatedModalIsHidden"
  : "docCreatedModalIsHidden";

export default class ModalsDraftCreatedComponent extends Component<ModalsDraftCreatedComponentSignature> {
  get localStorageSetting(): string | null {
    return window.localStorage.getItem(DRAFT_CREATED_LOCAL_STORAGE_KEY);
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
      window.localStorage.setItem(DRAFT_CREATED_LOCAL_STORAGE_KEY, "true");
    }
    this.args.close();
  }

  @action toggleChecked() {
    this.checkboxClicked = !this.checkboxClicked;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Modals::DraftCreated": typeof ModalsDraftCreatedComponent;
  }
}
