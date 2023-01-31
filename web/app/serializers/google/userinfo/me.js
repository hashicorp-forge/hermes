import RESTSerializer from "@ember-data/serializer/rest";

export default class GoogleDriveFileSerializer extends RESTSerializer {
  normalizeQueryRecordResponse(
    store,
    primaryModelClass,
    payload,
    id,
    requestType
  ) {
    return super.normalizeQueryResponse(
      store,
      primaryModelClass,
      {
        "google.userinfo.me": payload,
      },
      id,
      requestType
    );
  }
}
