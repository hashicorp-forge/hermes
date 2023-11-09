import Component from "@glimmer/component";
import { HermesPersonAvatarSize } from "hermes/types/avatar-size";
import { HermesSize } from "hermes/types/sizes";

interface PersonAvatarComponentSignature {
  Element: HTMLDivElement;
  Args: {
    imgURL?: string | null;
    isLoading?: boolean;
    email: string;
    size?: `${HermesPersonAvatarSize}`;
  };
  Blocks: {
    default: [];
  };
}

export default class PersonAvatarComponent extends Component<PersonAvatarComponentSignature> {
  protected size = this.args.size ?? HermesSize.Small;
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Person::Avatar": typeof PersonAvatarComponent;
  }
}
