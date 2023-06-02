import Component from "@glimmer/component";
import { HermesUser } from "hermes/types/document";

interface MultiselectUserEmailImageChipComponentSignature {
  Element: HTMLDivElement;
  Args: {
    option: HermesUser;
  };
  Blocks: {
    default: [];
  };
}

export default class MultiselectUserEmailImageChipComponent extends Component<MultiselectUserEmailImageChipComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "multiselect/user-email-image-chip": typeof MultiselectUserEmailImageChipComponent;
  }
}
