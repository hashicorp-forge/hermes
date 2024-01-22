import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import Store from "@ember-data/store";

interface PersonComponentSignature {
  Element: HTMLDivElement;
  Args: {
    email: string;
    imgURL?: string | null;
    ignoreUnknown?: boolean;
    badge?: string;
  };
}

export default class PersonComponent extends Component<PersonComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare store: Store;

  get isHidden() {
    return this.args.ignoreUnknown && !this.args.email;
  }

  protected get label() {
    if (this.args.email === this.authenticatedUser.info.email) {
      return "Me";
    }

    if (this.args.email) {
      // we expect the route to have already loaded the person's record
      return (
        this.store.peekRecord("person", this.args.email)?.name ??
        this.args.email
      );
    }

    return "Unknown";
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Person: typeof PersonComponent;
  }
}
