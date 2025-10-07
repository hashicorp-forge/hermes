import { service } from "@ember/service";
import Component from "@glimmer/component";
import StoreService from "hermes/services/store";
import { HermesSize } from "hermes/types/sizes";
import getModelAttr from "hermes/utils/get-model-attr";

interface PersonAvatarComponentSignature {
  Element: HTMLDivElement;
  Args: {
    imgURL?: string;
    isLoading?: boolean;
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
    return (
      this.args.imgURL ??
      getModelAttr(this.store, ["person.picture", this.args.email])
    );
  }

  protected get fallbackIcon(): string {
    if (!this.args.email) return "user";

    const isGroup = this.store.peekRecord("group", this.args.email);

    return isGroup ? "users" : "user";
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Person::Avatar": typeof PersonAvatarComponent;
  }
}
