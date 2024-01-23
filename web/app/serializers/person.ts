import JSONSerializer from "@ember-data/serializer/json";
import DS from "ember-data";
import RSVP from "rsvp";

export default class PersonSerializer extends JSONSerializer {
  normalizeResponse(
    store: any, // TODO: find Store class
    primaryModelClass: any, // TODO: find Model class type
    payload: any, // TODO: find payload type, maybe ModelFor?
    id: any, // null
    requestType: any, // e.g., 'findAll'
  ) {
    console.log("paylaow", payload);

    if (requestType === "query") {
      payload = payload.results;
      const dataObjects = payload.map((p: any) => {
        return {
          id: p.emailAddresses[0].value,
          type: primaryModelClass.modelName,
          attributes: {
            name: p.names[0].displayName,
            firstName: p.names[0].givenName,
            email: p.emailAddresses[0].value,
            picture: p.photos[0].url,
          },
        };
      });

      payload = {
        data: dataObjects,
      };

      // results are an array of GoogleUsers
    } else if (requestType === "queryRecord") {
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
    }

    return payload;
  }
}
