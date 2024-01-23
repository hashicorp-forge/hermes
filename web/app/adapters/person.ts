import DS from "ember-data";
import ApplicationAdapter from "./application";
import RSVP from "rsvp";

// TODO: Improve `query` type
export default class PersonAdapter extends ApplicationAdapter {
  query(_store: DS.Store, _type: DS.Model, query: any) {
    const results = this.fetchSvc
      .fetch(`/api/${this.configSvc.config.api_version}/people`, {
        method: "POST",
        body: JSON.stringify({
          query: query.query,
        }),
      })
      .then((r) => r?.json());

    return RSVP.hash({ results });
  }
}
