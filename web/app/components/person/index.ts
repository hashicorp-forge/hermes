import { service } from "@ember/service";
import Component from "@glimmer/component";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import StoreService from "hermes/services/store";
import getModelAttr from "hermes/utils/get-model-attr";

interface PersonComponentSignature {
  Element: HTMLDivElement;
  Args: {
    email?: string;
    ignoreUnknown?: boolean;
    badge?: string;
  };
}

export default class PersonComponent extends Component<PersonComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare store: StoreService;

  get isHidden() {
    return this.args.ignoreUnknown && !this.args.email;
  }

  protected get label() {
    if (this.args.email === this.authenticatedUser.info?.email) {
      return "Me";
    }

    return (
      getModelAttr(this.store, ["person.name", this.args.email], {
        fallback: "group.name",
      }) ??
      this.args.email ??
      "Unknown"
    );
  }

  /**
   * Whether the badge should be shown.
   * True if the badge is either "approved" or "rejected".
   */
  protected get badgeIsShown() {
    const { badge } = this.args;
    return badge === "approved" || badge === "rejected";
  }

  /**
   * The icon to use in the badge, when shown.
   * Reflects either the "approved" or "rejected" state.
   */
  protected get badgeIcon() {
    switch (this.args.badge) {
      case "approved":
        return "check-circle-fill";
      case "rejected":
        return "x-circle-fill";
    }
  }

  /**
   * The color to use for the badge icon, when shown.
   * Reflects either the "approved" or "rejected" state.
   */
  protected get badgeIconColor() {
    switch (this.badgeIcon) {
      case "check-circle-fill":
        return "text-color-palette-green-200";
      case "x-circle-fill":
        return "text-color-foreground-faint";
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Person: typeof PersonComponent;
  }
}
