import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";

interface DocRowComponentSignature {
  Args: {
    avatar: string;
    createdDate: string;
    docID: string;
    docNumber: string;
    docType: string;
    owner: string;
    title: string;
    isDraft?: boolean;
    productArea: string;
    status: string;
    isResult?: boolean;
    isOwner?: boolean;
  };
}

export default class DocRowComponent extends Component<DocRowComponentSignature> {
  @service declare router: RouterService;

  protected get currentRoute() {
    return this.router.currentRouteName;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::Row": typeof DocRowComponent;
  }
}
