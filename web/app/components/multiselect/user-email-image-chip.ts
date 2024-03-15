import Component from "@glimmer/component";

interface MultiselectUserEmailImageChipComponentSignature {
  Element: HTMLDivElement;
  Args: {
    option: string;
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
    return this.args.option;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "multiselect/user-email-image-chip": typeof MultiselectUserEmailImageChipComponent;
  }
}
