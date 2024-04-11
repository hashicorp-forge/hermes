import JSONSerializer from "@ember-data/serializer/json";
import { assert } from "@ember/debug";
import DS from "ember-data";
import GroupModel from "hermes/models/group";

interface GroupPayload {
  results: GroupModel[] | null;
}

export default class GroupSerializer extends JSONSerializer {
  /**
   * The serializer for the `group` model.
   * Handles `query` requests to the EmberData store.
   * Formats the response to match the JSON spec.
   */
  normalizeResponse(
    _store: DS.Store,
    _primaryModelClass: GroupModel,
    payload: GroupPayload,
    _id: string | number | null,
    _requestType: "query",
  ) {
    assert("results are expected for query requests", "results" in payload);

    /**
     * If the results are `null`, return an empty array to show
     * the "No results found" message in the PeopleSelect.
     */
    if (!payload.results) return { data: [] };
    const groups = payload.results.map((g) => {
      return {
        id: g.email,
        type: "group",
        attributes: {
          name: g.name,
          email: g.email,
        },
      };
    });

    return { data: groups };
  }
}
