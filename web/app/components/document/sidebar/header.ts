import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import Ember from "ember";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import { restartableTask, timeout } from "ember-concurrency";
import ConfigService from "hermes/services/config";
import { HermesDocument } from "hermes/types/document";

interface DocumentSidebarHeaderComponentSignature {
  Args: {
    document: HermesDocument;
    isCollapsed: boolean;
    toggleCollapsed: () => void;
  };
}

export default class DocumentSidebarHeaderComponent extends Component<DocumentSidebarHeaderComponentSignature> {
  @service declare flashMessages: FlashMessageService;
  @service("config") declare configSvc: ConfigService;

  @tracked urlWasRecentlyCopied = false;

  protected get shareButtonIsShown() {
    let { document } = this.args;
    return !document.isDraft && document.docNumber && document.docType;
  }

  protected copyURL = restartableTask(async () => {
    const shortLinkBaseURL = this.configSvc.config.short_link_base_url;
    const url = shortLinkBaseURL
      ? `${shortLinkBaseURL + this.args.document.docType.toLowerCase()}/${
          this.args.document.docNumber
        }`
      : window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      if (navigator.clipboard.readText) {
        const result = await navigator.clipboard.readText();
        if (result === url) {
          this.urlWasRecentlyCopied = true;
        }
        await timeout(Ember.testing ? 0 : 2000);
        this.urlWasRecentlyCopied = false;
      }
    } catch (e) {
      this.flashMessages.add({
        title: "Error copying link",
        message: e as string,
        type: "critical",
        timeout: 5000,
        extendedTimeout: 1000,
      });
    }
  });
}
