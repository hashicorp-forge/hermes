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
        | Array<RelatedHermesDocument | undefined>
        | undefined,
    ) => {
      if (!emailsOrDocs) return;

      let promises: Promise<void>[] = [];
      let uniqueEmails: string[] = [];

      emailsOrDocs = emailsOrDocs.uniq(); // Remove duplicates

      emailsOrDocs.forEach((emailOrDoc) => {
        if (!emailOrDoc) {
          return;
        }

        /**
         * Create a placeholder variable for the email address.
         */
        let email: string | undefined;

        /**
         * Assign the email address to the placeholder variable
         * depending on whether the argument is a string or a document.
         */
        if (typeof emailOrDoc === "string") {
          email = emailOrDoc;
        } else {
          email = emailOrDoc.owners?.[0];
        }

        /**
         * If there's no email, skip it.
         */
        if (!email) return;

        /**
         * Skip processing if the record is already in the store.
         */
        if (this.peekRecord("person", email)) return;

        /**
         * Skip emails already queued for processing.
         */
        if (uniqueEmails.includes(email)) return;

        /**
         * Log the unique email so we don't try to fetch it again.
         */
        uniqueEmails.push(email);

        /**
         * Queue a promise request to `/api/v2/person?emails=${email}`
         * to return a GoogleUser when resolved.
         */
        promises.push(
          this.queryRecord("person", {
            emails: email,
          }).catch(() => {
            /**
             * Errors here are not necessarily indicative of a problem;
             * for example, we get a 404 if a once-valid user is no longer in
             * the directory. So we conditionally create a record for the email
             * to prevent future requests for the same email.
             */
            if (!email) return;
            const cachedRecord = this.peekRecord("person", email);

            if (!cachedRecord) {
              this.createRecord("person", {
                id: email,
                email,
              });
            }
          }),
        );
      });

      await Promise.all(promises);
    },
  );
}
