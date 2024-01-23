import Adapter from "@ember-data/adapter";
import { inject as service } from "@ember/service";
import DS from "ember-data";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import SessionService from "hermes/services/session";
import ApplicationAdapter from "./application";
import RSVP from "rsvp";

export default class PersonAdapter extends ApplicationAdapter {
  query(store: DS.Store, type: DS.Model, query: any) {
    console.log("query", query);
    const results = this.fetchSvc
      .fetch(`/api/${this.configSvc.config.api_version}/people`, {
        method: "POST",
        body: JSON.stringify({
          query: query.query,
        }),
      })
      .then((r) => r?.json());

    console.log("results", results);

    return RSVP.hash({
      results: results,
    });
  }
}
