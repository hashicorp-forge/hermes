import JSONSerializer from "@ember-data/serializer/json";
import DS from "ember-data";

export default class ApplicationSerializer extends JSONSerializer {
  /**
   * The default serializer for all models.
   * Formats the response to match the JSON spec.
   * Model-specific serializers should extend this class.
   */
  normalizeResponse(
    _store: DS.Store,
    primaryModelClass: any,
    payload: any,
    _id: string | number,
    _requestType: string,
  ) {
    payload = {
      data: [
        {
          id: payload.id,
          type: primaryModelClass.modelName,
          attributes: payload,
        },
      ],
    };

    return payload;
  }
}
