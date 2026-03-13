import JSONSerializer from "@ember-data/serializer/json";
import { assert } from "@ember/debug";
import type DS from "ember-data";

interface GoogleUser {
  emailAddresses: Array<{ value: string }>;
  names: Array<{ displayName: string; givenName: string }>;
  photos: Array<{ url: string }>;
}

export default class PersonSerializer extends JSONSerializer {
  private normalizePerson(p: GoogleUser, type: string) {
    const email = p.emailAddresses?.[0]?.value;

    if (!email) return;

    const name = p.names?.[0]?.displayName;
    const firstName = p.names?.[0]?.givenName;
    const picture = p.photos?.[0]?.url;

    return {
      id: email,
      type,
      attributes: {
        name: name ?? email,
        firstName: firstName ?? name ?? email,
        email,
        picture,
      },
    };
  }

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
    const type = "person";

    if (requestType === "query") {
      assert("results are expected for query requests", "results" in payload);

      /**
       * If the results are `null`, return an empty array to show
       * the "No results found" message in the PeopleSelect.
       */
      if (!payload.results) return { data: [] };

      const people = payload.results
        .map((p) => this.normalizePerson(p, type))
        .filter(Boolean);

      return { data: people };
    } else if (requestType === "queryRecord") {
      assert(
        "payload should not be an array of results",
        !("results" in payload),
      );

      const record = payload[0];

      if (!record) return {};

      const person = this.normalizePerson(record, type);

      if (!person) return {};

      return { data: person };
    } else {
      // Currently only `query` and `queryRecord` requests are used.
      return {};
    }
  }
}
