import DS from "ember-data";
import ApplicationAdapter from "./application";
import RSVP from "rsvp";
import ModelRegistry from "ember-data/types/registries/model";

export default class ProjectAdapter extends ApplicationAdapter {
  findRecord<K extends string | number>(
    _store: DS.Store,
    _type: ModelRegistry[K],
    id: string,
    _snapshot: DS.Snapshot<K>,
  ): RSVP.Promise<any> {
    const project = this.fetchSvc
      .fetch(`/api/${this.configSvc.config.api_version}/projects/${id}`)
      .then((response) => response?.json());

    return RSVP.hash(project);
  }

  findAll<K extends string | number>(
    _store: DS.Store,
    _type: ModelRegistry[K],
    _sinceToken: string,
    _snapshotRecordArray: DS.SnapshotRecordArray<K>,
  ): RSVP.Promise<any> {
    const projects = this.fetchSvc
      .fetch(`/api/${this.configSvc.config.api_version}/projects`)
      .then((response) => response?.json());

    return RSVP.hash({ projects });
  }

  createRecord<K extends string | number>(
    _store: DS.Store,
    _type: ModelRegistry[K],
    snapshot: DS.Snapshot<K>,
  ): RSVP.Promise<any> {
    const data = this.serialize(snapshot, { includeId: true });

    const project = this.fetchSvc
      .fetch(`/api/${this.configSvc.config.api_version}/projects`, {
        method: "POST",
        body: JSON.stringify(data),
      })
      .then((response) => response?.json());

    return RSVP.hash(project);
  }
}
