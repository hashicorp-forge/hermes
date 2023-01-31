import JSONSerializer from "@ember-data/serializer/json";

export default class GoogleDriveFileSerializer extends JSONSerializer {
  normalizeQueryResponse(store, primaryModelClass, payload, id, requestType) {
    return super.normalizeQueryResponse(
      store,
      primaryModelClass,
      payload.files,
      id,
      requestType
    );
  }
}
