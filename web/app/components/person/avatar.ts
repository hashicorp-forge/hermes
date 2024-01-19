import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import { HermesSize } from "hermes/types/sizes";

interface PersonAvatarComponentSignature {
  Element: HTMLDivElement;
  Args: {
    imgURL?: string;
    email: string;
    size?: `${HermesSize}`;
  };
  Blocks: {
    default: [];
  };
}

export default class PersonAvatarComponent extends Component<PersonAvatarComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;

  protected size = this.args.size ?? HermesSize.Small;

  protected get iconIsLarge(): boolean {
    return this.size === HermesSize.Large || this.size === HermesSize.XL;
  }

  @tracked protected imgURL = this.args.imgURL;

  @action protected maybeLoadAvatar() {
    if (!this.imgURL) {
      this.getOwnerPhoto.perform();
    }
  }
  private getOwnerPhoto = task(async () => {
    const person = await this.fetchSvc
      .fetch(
        `/api/${this.configSvc.config.api_version}/people?emails=${this.args.email}`,
      )
      .then((response) => response?.json());

    this.imgURL = person[0].photos[0].url;
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Person::Avatar": typeof PersonAvatarComponent;
  }
}
