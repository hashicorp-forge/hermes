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
      },
    ];
  };
}

const serializePeople = (people: GoogleUser[] | null): HermesUser[] => {
  if (!people || !people.length) return [];

  return people.map((p) => ({
    email: p.emailAddresses[0]?.value as string,
    imgURL: p.photos?.[0]?.url,
  }));
};

export default class HermesUsersComponent extends Component<HermesUsersComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;

  @tracked isLoading = true;

  protected serializeUsers = task(async () => {
    if (!this.args.emails?.length) return;

    const people: GoogleUser[] = await this.fetchSvc
      .fetch(`/api/v1/people?emails=${this.args.emails?.join(",")}`)
      .then((r) => r?.json());

    this.serializedUsers = serializePeople(people);
    this.isLoading = false;
  });

  @tracked serializedUsers: HermesUser[] =
    this.args.emails?.map((email) => ({
      email,
    })) ?? [];

  @action updateUsers(users: HermesUser[]) {
    this.serializedUsers = users;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    HermesUsers: typeof HermesUsersComponent;
  }
}
