import Component from "@glimmer/component";
import { task } from "ember-concurrency";
import { tracked } from "@glimmer/tracking";
import { HermesUser } from "hermes/types/document";
import { inject as service } from "@ember/service";
import FetchService from "hermes/services/fetch";
import { GoogleUser } from "./inputs/people-select";
import { action } from "@ember/object";

interface HermesUsersComponentSignature {
  Element: HTMLDivElement;
  Args: {
    emails?: string[];
    onSave: (value: string[]) => Promise<void>;
  };
  Blocks: {
    default: [
      h: {
        isLoading: boolean;
        users: HermesUser[];
        emails: string[];
        onChange: (users: HermesUser[]) => void;
        onCancel: (emails?: string[]) => void;
        onSave: () => void;
      },
    ];
  };
}

const serializePeople = (people: GoogleUser[]): HermesUser[] => {
  if (!people.length) return [];

  return people.map((p) => ({
    email: p.emailAddresses[0]?.value as string,
    imgURL: p.photos?.[0]?.url,
  }));
};

export default class HermesUsersComponent extends Component<HermesUsersComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;

  // does this work more than once?
  @tracked _cachedHermesUsers: HermesUser[] = [];

  @tracked isLoading = true;

  /**
   * This is only called once, fwiw
   */
  protected serializeUsers = task(async () => {
    if (!this.args.emails?.length) return;

    const people: GoogleUser[] = await this.fetchSvc
      .fetch(`/api/v1/people?emails=${this.args.emails?.join(",")}`)
      .then((r) => r?.json());

    if (people) {
      this.index = serializePeople(people);
      this._cachedHermesUsers = this.index;
    }

    this.isLoading = false;
  });

  @tracked index: HermesUser[] =
    this.args.emails?.map((email) => ({
      email,
    })) ?? [];

  get emails() {
    return this.index.map((user) => user.email);
  }
  /**
   * this runs when a person is added/removed within the people-select.
   * not when cancelled or committed.
   */
  @action onChange(users: HermesUser[]) {
    console.log("onChange users", users);
    this.index = users;
  }

  @action onSave() {
    void this.args.onSave(this.emails);
  }

  @action onCancel(emails?: HermesUser[]) {
    if (!emails) {
      this.index = [];
      return;
    }
    this.index = this._cachedHermesUsers;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    HermesUsers: typeof HermesUsersComponent;
  }
}
