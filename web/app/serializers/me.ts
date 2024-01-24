import JSONSerializer from "@ember-data/serializer/json";
import DS from "ember-data";

interface Me {
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
    _store: DS.Store,
    _primaryModelClass: any,
    payload: Me,
    _id: string | number,
    _requestType: string,
  ) {
    const type = "me";
    const { email, given_name, name, picture } = payload;

    return {
      data: {
        id: email,
        type,
        attributes: {
          email,
          firstName: given_name,
          name,
          picture,
        },
      },
    };
  }
}
