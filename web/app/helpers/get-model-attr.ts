import Helper from "@ember/component/helper";
import { inject as service } from "@ember/service";
import StoreService from "hermes/services/store";
import getModelAttr, { GetModelAttrArgs } from "hermes/utils/get-model-attr";

export interface GetModelAttrSignature {
  Args: {
    Positional: GetModelAttrArgs;
  };
  Return: any;
}

export default class GetModelAttrHelper extends Helper<GetModelAttrSignature> {
  @service declare store: StoreService;

  compute(positional: GetModelAttrArgs) {
    return getModelAttr(this.store, positional);
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "get-model-attr": typeof GetModelAttrHelper;
  }
}
