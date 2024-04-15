import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

interface AdminDoctypesModalMoreInfoLinkComponentSignature {
  Args: {
    onClose: () => void;
  };
  Blocks: {
    default: [];
  };
}

export default class AdminDoctypesModalMoreInfoLinkComponent extends Component<AdminDoctypesModalMoreInfoLinkComponentSignature> {
  @action protected submit() {
    // TODO
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Admin::Doctypes::Modal::MoreInfoLink": typeof AdminDoctypesModalMoreInfoLinkComponent;
  }
}
