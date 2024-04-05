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

  /**
   * Shorthand for the ModalAlerts `opened` property.
   * Reduces boilerplate in the template.
   */
  private get opened() {
    return this.modalAlerts.opened;
  }

  /**
   * Shorthand for the ModalAlerts `close` method.
   * Reduces boilerplate in the template.
   */
  @action private close() {
    this.modalAlerts.close();
  }

  <template>
    {{#if (eq this.opened ModalType.DraftCreated)}}
      <DraftCreated @close={{this.close}} />
    {{else if (eq this.opened ModalType.DocTransferred)}}
      <DocTransferred @close={{this.close}} />
    {{/if}}
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Modals: typeof ModalsComponent;
  }
}
