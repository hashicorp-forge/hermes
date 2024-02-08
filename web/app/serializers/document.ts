import JSONSerializer from "@ember-data/serializer/json";
import { assert } from "@ember/debug";
import DS from "ember-data";
import { HermesDocument } from "hermes/types/document";

export default class DocumentSerializer extends JSONSerializer {
  normalizeResponse(
    _store: DS.Store,
    _primaryModelClass: any,
    payload: { doc: HermesDocument },
    _id: string | number,
    requestType: string,
  ) {
    const { doc } = payload;
    const {
      _snippetResult,
      appCreated,
      approvers,
      contributors,
      created,
      createdTime,
      customEditableFields,
      docNumber,
      docType,
      isDraft,
      locked,
      modifiedTime,
      objectID,
      owners,
      product,
      projects,
      title,
      status,
    } = doc;

    if (requestType === "findRecord") {
      return {
        data: {
          id: objectID,
          type: "document",
          attributes: {
            _snippetResult,
            appCreated,
            approvers,
            contributors,
            created,
            createdTime,
            customEditableFields,
            docNumber,
            docType,
            isDraft,
            locked,
            modifiedTime,
            objectID,
            owners,
            product,
            projects,
            title,
            status,
          },
        },
      };
    }

    return {};
  }
}
