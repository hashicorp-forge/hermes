import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import ModalAlertsService from "hermes/services/modal-alerts";
import eq from "ember-truth-helpers/helpers/eq";
import { ModalType } from "hermes/services/modal-alerts";
import DraftCreated from "hermes/components/modals/draft-created";
import DocTransferred from "hermes/components/modals/doc-transferred";
import { action } from "@ember/object";

export default class ModalsComponent extends Component {
  @service declare modalAlerts: ModalAlertsService;

  private get modal() {
    return this.modalAlerts.activeModal;
  }

  @action private close() {
    this.modalAlerts.closeAndResetData();
  }

  <template>
    {{#if (eq this.modal ModalType.DraftCreated)}}
      <DraftCreated @close={{this.close}} />
    {{else if (eq this.modal ModalType.DocTransferred)}}
      <DocTransferred @close={{this.close}} />
    {{/if}}
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Modals: typeof ModalsComponent;
  }
}
