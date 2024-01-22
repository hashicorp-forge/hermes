import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { dropTask, task } from "ember-concurrency";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import { HermesSize } from "hermes/types/sizes";
import Store from "@ember-data/store";

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
  @service declare store: Store;

  protected size = this.args.size ?? HermesSize.Small;

  protected get iconIsLarge(): boolean {
    return this.size === HermesSize.Large || this.size === HermesSize.XL;
  }

  @tracked protected imgURL = this.args.imgURL;

  @action protected maybeLoadAvatar() {
    if (!this.imgURL) {
      // want to see if we can peek the record before we load it.

      const cachedRecord = this.store.peekRecord("person", this.args.email);
      console.log("recordIsLoaded", cachedRecord);

      if (cachedRecord) {
        this.imgURL = cachedRecord.picture;
      } else {
        this.getOwnerPhoto.perform();
      }
    }
  }
  private getOwnerPhoto = task(async () => {
    // const person = await this.fetchSvc
    //   .fetch(
    //     `/api/${this.configSvc.config.api_version}/people?emails=${this.args.email}`,
    //   )
    //   .then((response) => response?.json());

    // this.imgURL = person[0].photos[0].url;

    // this should only load if it needs to.

    // can we peek the record?

    // want to see if we can peek the record before we load it.

    // why are these happening synchronously?

    // FIXME: this is happening at too low a level
    // for avatars to be aware of one another, that's why
    // we'll get weird loading the first time we load a page

    console.log("loading Sucneps");
    const person = await this.store.queryRecord("person", {
      emails: this.args.email,
    });

    this.imgURL = person.picture;
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Person::Avatar": typeof PersonAvatarComponent;
  }
}
