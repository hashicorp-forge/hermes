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
    payload: GoogleUser[] | { results: GoogleUser[] },
    _id: string | number,
    requestType: string,
  ) {
    const type = "person";

    if (requestType === "query") {
      assert("results are expected for query requests", "results" in payload);
      console.log("payload", payload);
      const people = payload.results.map((p: any) => {
        return {
          id: p.emailAddresses[0].value,
          type,
          attributes: {
            name: p.names[0].displayName,
            firstName: p.names[0].givenName,
            email: p.emailAddresses[0].value,
            picture: p.photos[0].url,
          },
        };
      });
      // does this add them to the store?

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
      // Currently only `query` and `queryRecord` requests are handled.
      return {};
    }
  }
}
