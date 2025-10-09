import DS from "ember-data";
import ApplicationAdapter from "./application";
import RSVP from "rsvp";

export default class PersonAdapter extends ApplicationAdapter {
  /**
   * Queries using the `body` parameter instead of a queryParam.
   * Default query:     `/people?query=foo`
   * Our custom query:  `/people` with `{ query: "foo" }` in the request body.
   */
  query(_store: DS.Store, _type: DS.Model, query: { query: string }) {
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

  /**
   * Queries for a single person record using emailAddress parameter.
   * Used by store.queryRecord("person", { emails: "user@example.com" })
   */
  queryRecord(_store: DS.Store, _type: DS.Model, query: { emails: string }) {
    return RSVP.Promise.resolve(
      this.fetchSvc
        .fetch(`/api/${this.configSvc.config.api_version}/people?emailAddress=${query.emails}`)
        .then((r) => r?.json())
    );
  }
}
