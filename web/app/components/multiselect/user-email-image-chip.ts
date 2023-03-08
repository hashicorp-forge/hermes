import Component from "@glimmer/component";
import { GoogleUser } from "../inputs/people-select";

interface MultiselectUserEmailImageChipComponentSignature {
  Args: {
    option: GoogleUser;
  };
}

export default class MultiselectUserEmailImageChipComponent extends Component<MultiselectUserEmailImageChipComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Multiselect::UserEmailImageChip": typeof MultiselectUserEmailImageChipComponent;
  }
}
