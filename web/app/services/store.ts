import { task } from "ember-concurrency";
import Store from "@ember-data/store";

export default class StoreService extends Store {
  /**
   * The task to fetch a person's record if it's not already in the EmberData store.
   * Retrieves the record, which pushes it to the store to be used by components like
   * `Avatar` and `Person` for showing rich data from an email reference.
   */
  maybeFetchPeople = task(async (emails: string[]) => {
    let promises: Promise<void>[] = [];

    emails = emails.uniq(); // Remove duplicates

    emails.forEach((email?: string) => {
      if (!email) {
        return;
      }

      /**
       * Check if the record is already in the store.
       */
      let cachedRecord = this.peekRecord("person", email);

      if (!cachedRecord) {
        /**
         * Queue a promise request to `/api/v2/person?emails=${email}`
         * to return a GoogleUser object when resolved.
         */
        promises.push(
          this.queryRecord("person", {
            emails: email,
          }).catch(() => {
            /**
             * Errors here are not necessarily indicative of a problem;
             * for example, we get a 404 if a once-valid user is no longer in
             * the directory. So we let the component to handle the undefined state.
             */
            console.warn(`No results for ${email}`);
          }),
        );
      }
    });

    await Promise.all(promises);
  });
}
