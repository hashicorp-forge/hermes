import { task } from "ember-concurrency";
import Store from "@ember-data/store";
import { HermesDocument } from "hermes/types/document";
import { RelatedHermesDocument } from "hermes/components/related-resources";
import { withTimeout } from "hermes/utils/promise-timeout";

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
      console.log('[Store] 🔄 maybeFetchPeople starting, items:', emailsOrDocs?.length);
      if (!emailsOrDocs) return;

      let promises: Promise<void | any>[] = [];
      let uniqueEmails: string[] = [];
      
      // Track seen input items to skip duplicates early (replaces deprecated .uniq())
      const seenInputs = new Set<string | object>();

      emailsOrDocs.forEach((emailOrDoc) => {
        if (!emailOrDoc) {
          return;
        }

        // Skip if we've already processed this exact input item
        if (seenInputs.has(emailOrDoc)) {
          return;
        }
        seenInputs.add(emailOrDoc);

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
        if (this.peekRecord("person", email) || this.peekRecord("group", email))
          return;

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
         * Wrap with timeout to prevent indefinite hangs.
         */
        promises.push(
          withTimeout(
            this.queryRecord("person", {
              emails: email,
            }),
            15000, // 15 second timeout per person
            `Fetching person record for ${email}`
          ).catch((error) => {
            /**
             * Errors here are not necessarily indicative of a problem;
             * for example, we get a 404 if a once-valid user is no longer in
             * the directory. So we conditionally create a record for the email
             * to prevent future requests for the same email.
             */
            console.warn(`[Store] ⚠️ Failed to fetch person ${email}:`, error.message);
            if (!email) return;
            const cachedRecord = this.peekRecord("person", email);

            if (!cachedRecord) {
              this.createRecord("person", {
                id: email,
                email,
              });
            }
          }),
          /**
           * Groups API doesn't have a `findRecord` equivalent, so we query instead.
           * Wrap with timeout to prevent indefinite hangs.
           */
          withTimeout(
            this.query("group", {
              query: email,
            }),
            15000, // 15 second timeout per group
            `Fetching group record for ${email}`
          ).catch((error) => {
            /**
             * Errors here are not necessarily indicative of a problem;
             * for example, we get a 404 if a once-valid user is no longer in
             * the directory. So we conditionally create a record for the email
             * to prevent future requests for the same email.
             */
            console.warn(`[Store] ⚠️ Failed to fetch group ${email}:`, error.message);
            if (!email) return;
            const cachedRecord = this.peekRecord("group", email);

            if (!cachedRecord) {
              this.createRecord("group", {
                id: email,
                email,
              });
            }
          }),
        );
      });

      console.log('[Store] 📡 Awaiting', promises.length, 'API requests...');
      try {
        await Promise.all(promises);
        console.log('[Store] ✅ maybeFetchPeople complete');
      } catch (error) {
        console.error('[Store] ❌ Error in maybeFetchPeople:', error);
        // Don't throw - this is non-critical, we've already handled individual errors
      }
    },
  );
}
