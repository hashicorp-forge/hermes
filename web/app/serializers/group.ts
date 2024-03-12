import JSONSerializer from "@ember-data/serializer/json";
import DS from "ember-data";
import GroupModel from "hermes/models/group";

interface GroupPayload {
  kind: string;
  etag: string;
  groups: GroupModel[];
  nextPageToken: string;
}

// PLACEHOLDER //

interface GroupQueryParams {
  query?: string;
  customer?: string;
  domain?: string;
  maxResults?: number;
  orderBy?: string;
  pageToken?: string;
  sortOrder?: string;
  userKey?: string;
}

export default class GroupSerializer extends JSONSerializer {
  /**
   * The serializer for the `person` model.
   * Handles `query` and `queryRecord` requests to the EmberData store.
   * Formats the response to match the JSON spec.
   */
  normalizeResponse(
    _store: DS.Store,
    _primaryModelClass: GroupModel,
    _payload: GroupPayload,
    _id: string | number | null,
    requestType: "query",
  ) {
    debugger;
    return {};
  }
}
