import JSONSerializer from "@ember-data/serializer/json";

export default class PersonSerializer extends JSONSerializer {
  normalizeResponse(
    store: any, // TODO: find Store class
    primaryModelClass: any, // TODO: find Model class type
    payload: any, // TODO: find payload type, maybe ModelFor?
    id: any, // null
    requestType: any, // e.g., 'findAll'
  ) {
    console.log("originalPayload", payload);
    payload = {
      data: {
        id: payload[0].emailAddresses[0].value, // so it can be queried
        type: primaryModelClass.modelName,
        attributes: {
          name: payload[0].names[0].displayName,
          firstName: payload[0].names[0].givenName,
          email: payload[0].emailAddresses[0].value,
          picture: payload[0].photos[0].url,
        },
      },
    };
    console.log("newPayload", payload);

    return payload;
  }
}
