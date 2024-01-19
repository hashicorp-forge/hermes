import JSONSerializer from "@ember-data/serializer/json";

export default class ApplicationSerializer extends JSONSerializer {
  normalizeResponse(
    store: any, // TODO: find Store class
    primaryModelClass: any, // TODO: find Model class type
    payload: any, // TODO: find payload type, maybe ModelFor?
    id: any, // null
    requestType: any, // e.g., 'findAll'
  ) {
    console.log("I ))))D ", id);
    console.log("QUEST TYPE", requestType);
    console.log("stoe", store);
    // TODO: investigate if the store should be used somewhere

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
