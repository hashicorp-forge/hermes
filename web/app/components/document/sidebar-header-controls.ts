import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import Ember from "ember";
import { restartableTask, timeout } from "ember-concurrency";
import { HermesDocument } from "hermes/types/document";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";

interface DocumentSidebarHeaderControlsComponentSignature {
  Args: {
    document: HermesDocument;
    shareButtonIsShown: boolean;
    isCollapsed: boolean;
    toggleCollapsed: () => void;
  };
}

export default class DocumentSidebarHeaderControlsComponent extends Component<DocumentSidebarHeaderControlsComponentSignature> {
  @service("config") declare configSvc: ConfigService;

  protected get shortLinkBaseURL() {
    return this.configSvc.config.short_link_base_url;
  }
  @tracked urlRecentlyCopied = false;

  copyUrl = restartableTask(async () => {
    let url = this.shortLinkBaseURL
      ? `${
          this.shortLinkBaseURL
        }/${this.args.document.docType.toLowerCase()}/${this.args.document.docNumber.toLowerCase()}`
      : window.location.href;

    await navigator.clipboard.writeText(url);

    if (navigator.clipboard.readText) {
      const result = await navigator.clipboard.readText();

      if (result === url) {
        this.urlRecentlyCopied = true;
        await timeout(Ember.testing ? 0 : 2000);
      }

      this.urlRecentlyCopied = false;
    }
  });
}
