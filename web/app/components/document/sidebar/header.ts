import Component from "@glimmer/component";
import ConfigService from "hermes/services/config";
import { inject as service } from "@ember/service";
import { HermesDocument } from "hermes/types/document";

interface DocumentSidebarHeaderComponentSignature {
  Args: {
    document: HermesDocument;
    isCollapsed: boolean;
    toggleCollapsed: () => void;
    userHasScrolled: boolean;
  };
}

export default class DocumentSidebarHeaderComponent extends Component<DocumentSidebarHeaderComponentSignature> {
  @service("config") declare configSvc: ConfigService;

  protected get shareButtonIsShown() {
    let { document } = this.args;
    return !document.isDraft && document.docNumber && document.docType;
  }

  protected get url() {
    const shortLinkBaseURL = this.configSvc.config.short_link_base_url;
    return shortLinkBaseURL
      ? `/${shortLinkBaseURL + this.args.document.docType.toLowerCase()}/${
          this.args.document.docNumber
        }`
      : window.location.href;
  }
}
