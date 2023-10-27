import Component from "@glimmer/component";
import { HermesAvatarSize } from "hermes/types/avatar-size";

interface PersonAvatarComponentSignature {
  Element: HTMLDivElement;
  Args: {
    imgURL?: string | null;
    isLoading?: boolean;
    email: string;
    size: `${HermesAvatarSize}`;
  };
  Blocks: {
    default: [];
  };
}

export default class PersonAvatarComponent extends Component<PersonAvatarComponentSignature> {
  protected get sizeIsSmall(): boolean {
    return this.args.size === HermesAvatarSize.Small;
  }

  protected get sizeIsMedium(): boolean {
    return this.args.size === HermesAvatarSize.Medium;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Person::Avatar": typeof PersonAvatarComponent;
  }
}
