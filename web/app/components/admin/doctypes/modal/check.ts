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

  @tracked protected links = ["link"];

  @action protected increaseLinkCount() {
    this.links.push("link");
    // Arrays don't automatically re-render in Glimmer components
    this.links = this.links;
  }

  @action protected hideAndResetAddLinkForm() {
    this.addLinkFormIsShown = false;
    // TODO: reset values
    this.links = [];
  }

  @action protected removeLink(index: number) {
    this.links.splice(index, 1);
    // Arrays don't automatically re-render in Glimmer components
    this.links = this.links;
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
