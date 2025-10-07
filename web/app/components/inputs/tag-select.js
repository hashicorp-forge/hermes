import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { service } from "@ember/service";
import { task } from "ember-concurrency";

export default class TagSelect extends Component {
  @service algolia;
  @service("config") configSvc;

  @tracked tagOpts = [];

  @action
  createTag(tag) {
    // Format tag as lowercase and remove spaces.
    tag = tag.toLowerCase().replace(/\s+/g, "");

    this.tagOpts.push(tag);
    this.args.onChange?.([...this.args.selected, tag]);
  }

  @action
  createTagSuggestion(tag) {
    return `Create new "${tag}" tag...`;
  }

  @task({ restartable: true }) *searchTags(query) {
    if (query) {
      const resp = yield this.algolia.searchForFacetValues.perform(
        this.configSvc.config.algolia_docs_index_name,
        "tags",
        query,
        {
          maxFacetHits: 7,
        }
      );
      return resp["facetHits"].map(({ value }) => value);
    }
  }
}
