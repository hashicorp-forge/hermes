import Service, { inject as service } from "@ember/service";
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

  init() {
    super.init();
    this.router.on("routeWillChange", () => {
      this.close();
    });
  }

  @tracked activeModal: ModalType | null = null;
  @tracked activeModalData: Record<string, unknown> = {};

  @action close(): void {
    this.activeModal = null;
  }

  @action closeAndResetData(): void {
    this.close();
    this.activeModalData = {};
  }
  /**
   * The action to activate a modal by name.
   * Scheduled `afterRender` to work on cross-route transitions
   */
  @action setActive(modalType: ModalType, data?: Record<string, unknown>) {
    this.activeModalData = data || {};

    schedule("afterRender", () => {
      this.activeModal = modalType;
    });
  }
}
