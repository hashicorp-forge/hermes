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
  };
  Blocks: {
    default: [
      h: {
        isLoading: boolean;
        users: HermesUser[];
        updateUsers: (users: HermesUser[]) => void;
        cancelUpdate: (emails?: string[]) => void;
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
      this.serializedUsers = serializePeople(people);
      this._cachedHermesUsers = this.serializedUsers;
    }

    this.isLoading = false;
  });

  @tracked serializedUsers: HermesUser[] =
    this.args.emails?.map((email) => ({
      email,
    })) ?? [];

  /**
   * this runs when a person is added/removed within the people-select.
   * not when cancelled or committed.
   */
  @action updateUsers(users: HermesUser[]) {
    console.log("updateUsers", users);
    console.log("updateUsers", this.serializedUsers);
    console.log("cachedUsers", this._cachedHermesUsers);
    this.serializedUsers = users;
  }

  @action cancelUpdate(emails?: HermesUser[]) {
    console.log("HU cancelUpdate", emails);
    if (!emails) {
      this.serializedUsers = [];
      return;
    }
    this.serializedUsers = this._cachedHermesUsers;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    HermesUsers: typeof HermesUsersComponent;
  }
}
