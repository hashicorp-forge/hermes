import Helper from "@ember/component/helper";
import { inject as service } from "@ember/service";
import StoreService from "hermes/services/store";

type GetModelAttrArgs = [model: string, attribute: string, id?: string];

export interface GetModelAttrSignature {
  Args: {
    Positional: GetModelAttrArgs;
  };
  Return: any;
}

/**
 * Returns the attribute of a model record of a given id, if it exists.
 * This helper does not fetch the record from the server,
 * leaving that responsibility to the route or component.
 */
export default class GetModelAttrHelper extends Helper<GetModelAttrSignature> {
  @service declare store: StoreService;

  compute(positional: GetModelAttrArgs) {
    const [model, attribute, id] = positional;

    if (!id) return;

    const record = this.store.peekRecord(model, id);

    return record?.get(attribute);
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "get-model-attr": typeof GetModelAttrHelper;
  }
}
