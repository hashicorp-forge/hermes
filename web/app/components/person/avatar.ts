import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { HermesSize } from "hermes/types/sizes";
import Store from "@ember-data/store";

interface PersonAvatarComponentSignature {
  Element: HTMLDivElement;
  Args: {
    isLoading?: boolean;
    email: string;
    size?: `${HermesSize}`;
  };
  Blocks: {
    default: [];
  };
}

export default class PersonAvatarComponent extends Component<PersonAvatarComponentSignature> {
  @service declare store: Store;
  protected size = this.args.size ?? HermesSize.Small;

  protected get imgURL(): string | undefined {
    if (!this.args.email) return;

    // We expect the route to have already loaded the person's record
    return this.store.peekRecord("person", this.args.email)?.picture;
  }

  protected get iconIsLarge(): boolean {
    return this.size === HermesSize.Large || this.size === HermesSize.XL;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Person::Avatar": typeof PersonAvatarComponent;
  }
}
