import DS from "ember-data";
import ApplicationAdapter from "./application";
import RSVP from "rsvp";
import ModelRegistry from "ember-data/types/registries/model";

export default class GroupAdapter extends ApplicationAdapter {
  /**
   * TODO
   */
  query(_store: DS.Store, _type: DS.Model, query: { query: string }) {
    const results = this.fetchSvc
      .fetch(`/api/${this.configSvc.config.api_version}/groups`, {
        method: "POST",
        body: JSON.stringify({
          query: query.query,
        }),
      })
      .then((r) => r?.json());

    return RSVP.hash({ results });
  }

  queryRecord<K extends string | number>(
    store: DS.Store,
    type: ModelRegistry[K],
    query: { emails: string },
  ): RSVP.Promise<any> {
    return this.query(store, type, { query: query.emails });
  }
}
