import { assert } from "@ember/debug";
import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { DraftResponseJSON } from "hermes/routes/authenticated/my";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { HermesDocument } from "hermes/types/document";

interface MySubNavComponentSignature {
  Args: {};
}

export enum SortDirection {
  Asc = "asc",
  Desc = "desc",
}

export enum SortAttribute {
  CreatedTime = "createdTime",
  Owner = "owners",
  Product = "product",
  Status = "status",
  DocType = "docType",
  Name = "title",
}

export default class MySubNavComponent extends Component<MySubNavComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUserService;
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "My::SubNav": typeof MySubNavComponent;
  }
}
