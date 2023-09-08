import Route from "@ember/routing/route";

interface AuthenticatedNewDocRouteParams {
  docType: string;
}

export default class AuthenticatedNewDocRoute extends Route {
  queryParams = {
    docType: {
      refreshModel: true,
    },
  };

  model(params: AuthenticatedNewDocRouteParams) {
    return params.docType;
  }
}
