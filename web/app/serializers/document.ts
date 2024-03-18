import JSONSerializer from "@ember-data/serializer/json";
import { assert } from "@ember/debug";
import DS from "ember-data";
import { HermesDocument } from "hermes/types/document";
import { ModelFrom } from "hermes/types/route-models";

export default class DocumentSerializer extends JSONSerializer {
  normalizeResponse(
    _store: DS.Store,
    primaryModelClass: any, // type this
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
          type: primaryModelClass.modelName,
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

    console.log("this needs an explanation! unhandled mess! ugh!");

    return {};
  }
}
