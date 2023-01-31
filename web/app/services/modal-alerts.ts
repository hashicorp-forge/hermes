import Service, { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import { task, timeout } from "ember-concurrency";

export type ModalType = "docCreated";

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

  setActive = task(async (modalType: ModalType, delay: number = 0) => {
    await timeout(delay);
    this.activeModal = modalType;
  });
}
