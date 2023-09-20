import Route from "@ember/routing/route";

interface AuthenticatedNewDocumentRouteParams {
  docType: string;
}

export default class AuthenticatedNewDocumentRoute extends Route {
  queryParams = {
    docType: {
      refreshModel: true,
    },
  };

  model(params: AuthenticatedNewDocumentRouteParams) {
    return params.docType;
  }
}
