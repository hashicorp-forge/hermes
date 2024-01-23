import JSONSerializer from "@ember-data/serializer/json";
import DS from "ember-data";

export default class ApplicationSerializer extends JSONSerializer {
  normalizeResponse(
    _store: DS.Store,
    primaryModelClass: DS.Model,
    payload: any,
    _id: string | number,
    _requestType: string,
  ) {
    payload = {
      data: [
        {
          id: payload.id,
          // @ts-ignore - FIXME: what is the correct type
          type: primaryModelClass.modelName,
          attributes: payload,
        },
      ],
    };

    return payload;
  }
}
