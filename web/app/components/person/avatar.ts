import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import StoreService from "hermes/services/store";
import { HermesSize } from "hermes/types/sizes";
import getModelAttr from "hermes/utils/get-model-attr";

interface PersonAvatarComponentSignature {
  Element: HTMLDivElement;
  Args: {
    isLoading?: boolean;
    // ALlow components to pass in a URL to an image to use as the avatar
    // Rather than fetching it from the store
    // For example, jiraAssignees
    // Although we should reduce dependence on jiraAssignee avatars, since they're not always available
    imgURL?: string;
    email?: string;
    size?: `${HermesSize}`;
  };
  Blocks: {
    default: [];
  };
}

export default class PersonAvatarComponent extends Component<PersonAvatarComponentSignature> {
  @service declare store: StoreService;

  protected size = this.args.size ?? HermesSize.Small;

  protected get iconIsLarge(): boolean {
    return this.size === HermesSize.Large || this.size === HermesSize.XL;
  }

  protected get imgURL(): string | undefined {
    if (this.args.imgURL) {
      return this.args.imgURL;
    } else {
      return getModelAttr(this.store, ["person.picture", this.args.email]);
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Person::Avatar": typeof PersonAvatarComponent;
  }
}
