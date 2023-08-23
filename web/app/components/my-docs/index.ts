import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { HermesDocument } from "hermes/types/document";

interface MyDocsIndexComponentSignature {
  Element: null;
  Args: {
    activeDocs: HermesDocument[];
    documents: HermesDocument[];
    drafts: HermesDocument[];
  };
  Blocks: {
    default: [];
  };
}

export default class MyDocsIndexComponent extends Component<MyDocsIndexComponentSignature> {
  @service declare router: RouterService;
  @service declare authenticatedUser: AuthenticatedUserService;

  get currentRoute() {
    return this.router.currentRouteName;
  }

  get docsToShow() {
    console.log(this.currentRoute);
    switch (this.currentRoute) {
      case "authenticated.my.drafts":
        console.log(this.args.drafts);
        return this.args.drafts;
      case "authenticated.my.index":
        return this.args.activeDocs;
      case "authenticated.my.published":
        return this.args.documents;
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    MyDocs: typeof MyDocsIndexComponent;
  }
}
