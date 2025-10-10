import JSONSerializer from "@ember-data/serializer/json";
import { assert } from "@ember/debug";
import DS from "ember-data";
import { GoogleUser } from "hermes/components/inputs/people-select";

export default class PersonSerializer extends JSONSerializer {
  /**
   * The serializer for the `person` model.
   * Handles `query` and `queryRecord` requests to the EmberData store.
   * Formats the response to match the JSON spec.
   */
  normalizeResponse(
    _store: DS.Store,
    _primaryModelClass: any,
    payload: GoogleUser[] | { results: GoogleUser[] | null },
    _id: string | number,
    requestType: string,
  ) {
    console.log('[PersonSerializer] 🔄 normalizeResponse called', { requestType, payload });
    const type = "person";

    if (requestType === "query") {
      assert("results are expected for query requests", "results" in payload);

      /**
       * If the results are `null`, return an empty array to show
       * the "No results found" message in the PeopleSelect.
       */
      if (!payload.results) {
        console.log('[PersonSerializer] ⚠️ No results in payload, returning empty array');
        return { data: [] };
      }

      const people = payload.results.map((p) => {
        return {
          id: p.emailAddresses[0]?.value,
          type,
          attributes: {
            name: p.names[0]?.displayName,
            firstName: p.names[0]?.givenName,
            email: p.emailAddresses[0]?.value,
            picture: p.photos[0]?.url,
          },
        };
      });
      console.log('[PersonSerializer] ✅ Returning normalized people data', { count: people.length, people });
      return { data: people };
    } else if (requestType === "queryRecord") {
      assert(
        "payload should not be an array of results",
        !("results" in payload),
      );

      const record = payload[0];

      if (!record) return {};

      return {
        data: {
          id: record.emailAddresses?.[0]?.value,
          type,
          attributes: {
            name: record.names[0]?.displayName,
            firstName: record.names[0]?.givenName,
            email: record.emailAddresses[0]?.value,
            picture: record.photos[0]?.url,
          },
        },
      };
    } else {
      // Currently only `query` and `queryRecord` requests are used.
      return {};
    }
  }
}
