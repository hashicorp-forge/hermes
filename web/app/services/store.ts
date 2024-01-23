import { task } from "ember-concurrency";
import Store from "@ember-data/store";

export type ModalType = "draftCreated";

export default class StoreService extends Store {
  maybeFetchPeople = task(async (people) => {
    // do we also want to accept an array of documents?
    // we're repeating a lot of `const docOwners = ...` logic

    let promises: Promise<void>[] = [];

    people = people.uniq();

    people.forEach((person?: string) => {
      if (!person) {
        return;
      }

      let cachedRecord = this.peekRecord("person", person);

      if (!cachedRecord) {
        promises.push(
          this.queryRecord("person", {
            emails: person,
          }).catch(() => {
            // we don't want to throw an error if we can't find a person
            console.warn(`Unable to find person with email ${person}`);
          }),
        );
      }
    });

    await Promise.all(promises);
  });
}
