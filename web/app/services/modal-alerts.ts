import Service, { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import { schedule } from "@ember/runloop";

export enum ModalType {
  DraftCreated = "draftCreated",
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

  @action close(): void {
    this.activeModal = null;
  }

  /**
   * The action to activate a modal by name.
   * Scheduled `afterRender` to work on cross-route transitions
   */
  @action setActive(modalType: ModalType) {
    schedule("afterRender", () => {
      this.activeModal = modalType;
    });
  }
}
