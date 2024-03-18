import DS from "ember-data";
import ApplicationAdapter from "./application";
import RSVP from "rsvp";
import ModelRegistry from "ember-data/types/registries/model";

export default class JiraIssueAdapter extends ApplicationAdapter {
  findRecord<K extends string | number>(
    _store: DS.Store,
    _type: ModelRegistry[K],
    id: string,
    _snapshot: DS.Snapshot<K>,
  ): RSVP.Promise<any> {
    const issue = this.fetchSvc
      .fetch(`/api/${this.configSvc.config.api_version}/jira/issues/${id}`)
      .then((response) => response?.json());

    return RSVP.resolve(issue);
  }
}
