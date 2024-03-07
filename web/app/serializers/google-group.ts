import JSONSerializer from "@ember-data/serializer/json";
import DS from "ember-data";
import GoogleGroupModel from "hermes/models/google-group";

interface GoogleGroupPayload {
  kind: string;
  etag: string;
  groups: GoogleGroupModel[];
  nextPageToken: string;
}

// PLACEHOLDER //

interface GoogleGroupQueryParams {
  query: string;
  customer?: string;
  domain?: string;
  maxResults?: number;
  orderBy?: string;
  pageToken?: string;
  sortOrder?: string;
  userKey?: string;
}

export default class GoogleGroupSerializer extends JSONSerializer {
  /**
   * The serializer for the `person` model.
   * Handles `query` and `queryRecord` requests to the EmberData store.
   * Formats the response to match the JSON spec.
   */
  normalizeResponse(
    _store: DS.Store,
    _primaryModelClass: any,
    _payload: GoogleGroupPayload,
    _id: string | number,
    requestType: string,
  ) {
    if (requestType === "query") {
      const groups = {
        // TODO:
      };
      return { data: groups };
    } else if (requestType === "queryRecord") {
      // i'm assuming this will be a customer search

      return {
        data: {
          // TODO:
        },
      };
    } else {
      // Currently only `query` and `queryRecord` requests are used.
      return {};
    }
  }
}
