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
    payload: unknown,
    _id: string | number,
    requestType: string,
  ) {
    const type = "person";

    if (requestType === "query") {
      return {};
    } else if (requestType === "queryRecord") {
      return {};
    } else {
      // Currently only `query` and `queryRecord` requests are used.
      return {};
    }
  }
}
