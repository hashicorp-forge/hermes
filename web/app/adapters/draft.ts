import DS from "ember-data";
import ApplicationAdapter from "./application";
import RSVP from "rsvp";
import ModelRegistry from "ember-data/types/registries/model";

export default class DraftAdapter extends ApplicationAdapter {
  findRecord<K extends string | number>(
    store: DS.Store,
    type: ModelRegistry[K],
    id: string,
    snapshot: DS.Snapshot<K>,
  ): RSVP.Promise<any> {
    const doc = this.fetchSvc
      .fetch(`${this.namespace}/drafts/${id}`, {
        headers: {
          // We set this header to differentiate between document views and
          // requests to only retrieve document metadata.
          "Add-To-Recently-Viewed": "true",
        },
      })
      .then((r) => r?.json());

    return RSVP.hash({ doc });
  }
}
