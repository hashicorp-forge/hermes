import Helper from "@ember/component/helper";
import { service } from "@ember/service";
import StoreService from "hermes/services/store";
import getModelAttr, { GetModelAttrArgs } from "hermes/utils/get-model-attr";

export interface GetModelAttrSignature {
  Args: {
    Positional: GetModelAttrArgs;
    Named: { fallback?: string };
  };
  Return: any;
}

export default class GetModelAttrHelper extends Helper<GetModelAttrSignature> {
  @service declare store: StoreService;

  compute(positional: GetModelAttrArgs, named: { fallback?: string }) {
    return getModelAttr(this.store, positional, named);
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "get-model-attr": typeof GetModelAttrHelper;
  }
}
