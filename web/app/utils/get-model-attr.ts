import StoreService from "hermes/services/store";

export type GetModelAttrArgs = [modelAndAttribute: string, id?: string];

/**
 * Returns the attribute of a model record of a given id, if it exists.
 * Does not fetch the record from the server, leaving that responsibility
 * to the route or component.
 */
export default function getModelAttr(
  store: StoreService,
  positional: GetModelAttrArgs,
  named?: {
    fallback?: string;
  },
) {
  const [modelAndAttribute, id] = positional;

  if (!id) return;

  const [model, attribute] = modelAndAttribute.split(".");

  if (!(model && attribute)) return;

  const record = store.peekRecord(model, id);

  if (!record) {
    if (named?.fallback) {
      const [model, attribute] = named.fallback.split(".");

      if (!(model && attribute)) return;

      const record = store.peekRecord(model, id);

      if (!record) return;

      return record.get(attribute);
    } else {
      return;
    }
  } else {
    return record.get(attribute);
  }
}
