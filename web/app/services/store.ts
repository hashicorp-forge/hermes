import { task } from "ember-concurrency";
import Store from "@ember-data/store";

export default class StoreService extends Store {
  /**
   * The task to fetch a person's record if it's not already in the EmberData store.
   * Retrieving the record pushes it to the store to be used by components like
   * `Avatar` and `Person` to show rich data from an email reference.
   */
  maybeFetchPeople = task(async (emails: string[]) => {
    let promises: Promise<void>[] = [];

    emails = emails.uniq();

    emails.forEach((email?: string) => {
      if (!email) {
        return;
      }

      let cachedRecord = this.peekRecord("person", email);

      if (!cachedRecord) {
        promises.push(
          /**
           * This queues a promise request to `/api/v2/person?emails=${email}`
           * that returns a GoogleUser object when resolved.
           */
          this.queryRecord("person", {
            emails: email,
          }).catch(() => {
            /**
             * Errors here are not necessarily indicative of a problem;
             * for example, we get a 404 if a once-valid user is no longer in
             * the directory. So we allow the component to handle the empty state.
             */
            console.warn(`No results for ${email}`);
          }),
        );
      }
    });

    await Promise.all(promises);
  });
}
