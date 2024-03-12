import DS from "ember-data";
import ApplicationAdapter from "./application";
import RSVP from "rsvp";

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
}
