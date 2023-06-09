import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import window from "ember-window-mock";
import { action } from "@ember/object";

let LOCAL_STORAGE_ITEM_NAME = "newFeaturesBanner";

interface DashboardNewFeaturesBannerSignature {
  Args: {};
}

export default class DashboardNewFeaturesBanner extends Component<DashboardNewFeaturesBannerSignature> {
  @tracked protected isDismissed = false;

  isShown(): boolean {
    const storageItem = window.localStorage.getItem(LOCAL_STORAGE_ITEM_NAME);

    if (storageItem === null) {
      window.localStorage.setItem(LOCAL_STORAGE_ITEM_NAME, "true");
      return true;
    } else if (storageItem === "true" && !this.isDismissed) {
      return true;
    } else return false;
  }

  @action
  dismiss() {
    window.localStorage.setItem(LOCAL_STORAGE_ITEM_NAME, "false");
    this.isDismissed = true;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Dashboard::NewFeaturesBanner": typeof DashboardNewFeaturesBanner;
  }
}
