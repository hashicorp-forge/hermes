import { task } from "ember-concurrency";
import Store from "@ember-data/store";
import { HermesDocument } from "hermes/types/document";
import { RelatedHermesDocument } from "hermes/components/related-resources";

export default class StoreService extends Store {
  /**
   * The task to fetch `person` records if they're not already in the EmberData store.
   * Retrieves the record which pushes it to the store to be used by components like
   * `Avatar` and `Person` for showing rich data in addition to email.
   * Can take a direct array of email addresses or an array of documents
   * whose owners should be fetched. (Other people, such as `approvers`,
   * should be fetched using a string array created by the component.)
   */
  maybeFetchPeople = task(
    async (
      emailsOrDocs:
        | Array<string | undefined>
        | Array<HermesDocument | undefined>
        | Array<RelatedHermesDocument | undefined>,
    ) => {
      let promises: Promise<void>[] = [];

      emailsOrDocs = emailsOrDocs.uniq(); // Remove duplicates

      emailsOrDocs.forEach((emailOrDoc) => {
        if (!emailOrDoc) {
          return;
        }

        /**
         * Create a variable to hold the email address.
         */
        let email: string | undefined;

        /**
         * Determine if it's an email or a document.
         */
        if (typeof emailOrDoc === "string") {
          email = emailOrDoc;
        } else {
          email = emailOrDoc.owners?.[0];
        }

        /**
         * Check if the record is already in the store.
         */
        let cachedRecord = email ? this.peekRecord("person", email) : null;

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
    },
  );
}
