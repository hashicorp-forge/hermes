import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import ConfigService from "hermes/services/config";
import { HermesDocument } from "hermes/types/document";

interface DocumentShareButtonComponentSignature {
  Args: {
    document: HermesDocument;
  };
}

export default class DocumentShareButtonComponent extends Component<DocumentShareButtonComponentSignature> {
  @service('config') declare configSvc: ConfigService;

  protected get shortLinkBaseURL() {
    return this.configSvc.config.short_link_base_url;
  }
}
