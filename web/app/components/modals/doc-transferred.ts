import { assert } from "@ember/debug";
import { service } from "@ember/service";
import Component from "@glimmer/component";
import ModalAlertsService from "hermes/services/modal-alerts";

interface ModalsDocTransferredComponentSignature {
  Args: {
    close: () => void;
  };
}

export default class ModalsDocTransferredComponent extends Component<ModalsDocTransferredComponentSignature> {
  @service declare modalAlerts: ModalAlertsService;

  protected get newOwner() {
    const { newOwner } = this.modalAlerts.data;
    assert("newOwner must be a string", typeof newOwner === "string");
    return newOwner;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Modals::DocTransferred": typeof ModalsDocTransferredComponent;
  }
}
