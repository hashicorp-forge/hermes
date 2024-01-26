import JSONSerializer from "@ember-data/serializer/json";
import DS from "ember-data";

interface MeResponse {
  email: string;
  given_name: string;
  name: string;
  picture: string;
}

export default class MeSerializer extends JSONSerializer {
  /**
   * The serializer for the `me` model.
   * Turns `given_name` into `firstName` to match the Person model.
   */
  normalizeResponse(
    store: DS.Store,
    _primaryModelClass: any,
    payload: MeResponse,
    _id: string | number,
    _requestType: string,
  ) {
    const { email, given_name, name, picture } = payload;

    // Also create a "person" record if it doesn't exist
    const isDuplicate = store.peekRecord("person", email);

    if (!isDuplicate) {
      store.createRecord("person", {
        id: email,
        email,
        name,
        firstName: given_name,
        picture,
      });
    }

    return {
      data: {
        id: email,
        type: "me",
        attributes: {},
      },
    };
  }
}
