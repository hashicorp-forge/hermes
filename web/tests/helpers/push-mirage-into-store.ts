// https://www.ember-cli-mirage.com/docs/testing/integration-and-unit-tests

import { getContext } from "@ember/test-helpers";
import { run } from "@ember/runloop";
import StoreService from "hermes/services/store";
import { MirageTestContext } from "ember-cli-mirage/test-support";

/**
 * Pushes Mirage models into the store, allowing them
 * to be found using `store.peekAll` and `store.peekRecord`.
 * Called during the `authenticateTestUser` utility function
 * to ensure that the default user can be found in the store.
 */
export default function pushMirageIntoStore() {
  let context = getContext() as MirageTestContext;
  let store = context.owner.lookup("service:store") as StoreService;

  const { server } = context;
  const { schema } = server;

  const keys = Object.keys(schema).filter(
    (key) => schema[key].all !== undefined,
  );

  keys.forEach((resource) => {
    const model = schema[resource].all();

    let { models = [] } = model;
    let { modelName } = model;

    // Ignore non-EmberData models
    try {
      store.modelFor(modelName);
    } catch (e) {
      return;
    }

    const records = models.map((model: any) => {
      const { attrs } = model;
      return {
        id: attrs.id,
        type: modelName,
        attributes: attrs,
      };
    });

    run(() => {
      store.push({
        data: records,
      });
    });
  });
}
