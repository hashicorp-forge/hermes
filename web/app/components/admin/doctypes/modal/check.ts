import { action } from "@ember/object";
import Component from "@glimmer/component";

interface AdminDoctypesModalCheckComponentSignature {
  Args: {
    onClose: () => void;
  };
  Blocks: {
    default: [];
  };
}

export default class AdminDoctypesModalCheckComponent extends Component<AdminDoctypesModalCheckComponentSignature> {
  @action protected submit() {
    // TODO:
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Admin::Doctypes::Modal::Check": typeof AdminDoctypesModalCheckComponent;
  }
}
