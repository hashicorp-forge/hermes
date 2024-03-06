import Component from "@glimmer/component";
import { PeopleSelectOption } from "../inputs/people-select";

interface MultiselectUserEmailImageChipComponentSignature {
  Element: HTMLDivElement;
  Args: {
    option: PeopleSelectOption | string;
  };
  Blocks: {
    default: [];
  };
}

export default class MultiselectUserEmailImageChipComponent extends Component<MultiselectUserEmailImageChipComponentSignature> {
  /**
   * The email of the chipped user.
   * If the option is a string, it is assumed to be the email,
   * otherwise it is the email property of the option.
   */
  protected get email() {
    const { option } = this.args;
    if (typeof option === "string") {
      return option;
    } else {
      return option.email;
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "multiselect/user-email-image-chip": typeof MultiselectUserEmailImageChipComponent;
  }
}
