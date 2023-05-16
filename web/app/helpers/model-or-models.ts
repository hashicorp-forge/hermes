import { helper } from "@ember/component/helper";
import { assert } from "@ember/debug";

export interface ModelOrModelsSignature {
  Args: {
    Positional: [unknown | undefined, unknown[] | undefined];
  };
  Return: unknown[];
}

/**
 * Returns the model or models based on the arguments passed.
 * Allows a LinkTo-based component to support all model scenarios (including no models)
 * without hitting internal assertions.
 */
const modelOrModelsHelper = helper<ModelOrModelsSignature>(
  ([model, models]: [unknown | undefined, Array<unknown> | undefined]) => {
    assert(
      "You can't pass both `@model` and `@models` to a LinkTo",
      !model || !models
    );
    if (models) {
      return models;
    } else {
      return model ? [model] : [];
    }
  }
);

export default modelOrModelsHelper;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "model-or-models": typeof modelOrModelsHelper;
  }
}
