import Component from "@glimmer/component";
import { HermesSize } from "hermes/types/sizes";

interface PersonAvatarComponentSignature {
  Element: HTMLDivElement;
  Args: {
    isLoading?: boolean;
    // ALlow components to pass in a URL to an image to use as the avatar
    // Rather than fetching it from the store
    // For example, jiraAssignees
    imgURL?: string;
    email: string;
    size?: `${HermesSize}`;
  };
  Blocks: {
    default: [];
  };
}

export default class PersonAvatarComponent extends Component<PersonAvatarComponentSignature> {
  protected size = this.args.size ?? HermesSize.Small;

  protected get iconIsLarge(): boolean {
    return this.size === HermesSize.Large || this.size === HermesSize.XL;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Person::Avatar": typeof PersonAvatarComponent;
  }
}
