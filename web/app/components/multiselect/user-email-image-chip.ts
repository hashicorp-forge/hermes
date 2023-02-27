import Component from "@glimmer/component";
import { DocumentPerson } from "document";

interface MultiselectUserEmailImageChipComponentSignature {
  Args: {
    option: DocumentPerson;
  };
}

export default class MultiselectUserEmailImageChipComponent extends Component<MultiselectUserEmailImageChipComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Multiselect::UserEmailImageChip": typeof MultiselectUserEmailImageChipComponent;
  }
}
