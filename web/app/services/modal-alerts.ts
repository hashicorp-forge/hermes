import Service, { service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import { schedule } from "@ember/runloop";

export enum ModalType {
  DraftCreated = "draftCreated",
  DocTransferred = "docTransferred",
}

export default class ModalAlertsService extends Service {
  @service declare router: RouterService;

  /**
   * The name of the currently shown modal, if any.
   * Used to determine which modal to show in the UI.
   */
  @tracked opened: ModalType | null = null;

  /**
   * Data for the active modal, if any.
   * Used to temporarily store data for a modal that would
   * otherwise be lost on a route transition.
   */
  @tracked data: Record<string, unknown> = {};

  /**
   * The action to hide the currently shown modal and reset the data.
   * Called when the user closes the modal.
   */
  @action close(): void {
    this.opened = null;
    this.data = {};
  }
  /**
   * The action to activate a modal by name.
   * Scheduled `afterRender` to work on cross-route transitions
   */
  @action open(modalType: ModalType, data?: Record<string, unknown>) {
    this.data = data || {};

    schedule("afterRender", () => {
      this.opened = modalType;
    });
  }
}
