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
    _primaryModelClass: any,
    _payload: GroupPayload,
    _id: string | number,
    requestType: string,
  ) {
    debugger;
    if (requestType === "query") {
      const groups = {
        // TODO:
      };
      return { data: groups };
    } else {
      // Currently only `query` requests are used.
      return {};
    }
  }
}
