import JSONSerializer from "@ember-data/serializer/json";

export default class PersonSerializer extends JSONSerializer {
  normalizeResponse(
    store: any, // TODO: find Store class
    primaryModelClass: any, // TODO: find Model class type
    payload: any, // TODO: find payload type, maybe ModelFor?
    id: any, // null
    requestType: any, // e.g., 'findAll'
  ) {
    console.log("normalizeResponse", {
      payload,
    });

    const firstObject = payload[0];

    console.log("firstObject", firstObject);
    console.log("firstObject.resourceName", firstObject.resourceName);
    console.log("firstObject.photos[0]", firstObject.photos[0]);

    payload = {
      data: [
        {
          id: payload[0].resourceName,
          type: primaryModelClass.modelName,
          attributes: {
            // name: payload[0].names[0].displayName,
            email: payload[0].emailAddresses[0].value,
            picture: payload[0].photos[0].url,
          },
        },
      ],
    };
    console.log("dat new paylo", payload);

    return payload;
  }

  // findRecord(store: any, type: any, id: any, snapshot: any) {
  //   console.log("findRecord", { store, type, id, snapshot });
  // }
}
