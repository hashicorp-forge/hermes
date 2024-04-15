import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

interface AdminDoctypesModalCheckComponentSignature {
  Args: {
    onClose: () => void;
  };
  Blocks: {
    default: [];
  };
}

export default class AdminDoctypesModalCheckComponent extends Component<AdminDoctypesModalCheckComponentSignature> {
  @tracked protected addLinkFormIsShown = false;

  @action protected showAddLinkForm() {
    this.addLinkFormIsShown = true;
  }

  @action protected hideAndResetAddLinkForm() {
    this.addLinkFormIsShown = false;
    // TODO: reset values
  }

  @action protected submit() {
    // TODO:
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Admin::Doctypes::Modal::Check": typeof AdminDoctypesModalCheckComponent;
  }
}
