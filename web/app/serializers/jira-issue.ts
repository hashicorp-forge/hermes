import JSONSerializer from "@ember-data/serializer/json";
import DS from "ember-data";
import JiraIssueModel from "hermes/models/jira-issue";

export default class JiraIssueSerializer extends JSONSerializer {
  /**
   * The serializer for the `person` model.
   * Handles `query` and `queryRecord` requests to the EmberData store.
   * Formats the response to match the JSON spec.
   */
  normalizeResponse(
    _store: DS.Store,
    _primaryModelClass: any,
    payload: JiraIssueModel,
    _id: string | number,
    _requestType: string,
  ) {
    return {
      data: {
        id: payload.key,
        type: "jira-issue",
        attributes: payload,
      },
    };
  }
}
