import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import window from "ember-window-mock";
import { action } from "@ember/object";

let LOCAL_STORAGE_ITEM_NAME = "july-20-2023-newFeatureBannerIsShown";

interface DashboardNewFeaturesBannerSignature {
  Args: {};
}

export default class DashboardNewFeaturesBanner extends Component<DashboardNewFeaturesBannerSignature> {
  @tracked protected isDismissed = false;

  /**
   * Whether the banner should be shown.
   * Set true on first visit to the dashboard and remains true
   * until the user dismisses the banner.
   */
  protected get isShown(): boolean {
    const storageItem = window.localStorage.getItem(LOCAL_STORAGE_ITEM_NAME);

    if (storageItem === null) {
      window.localStorage.setItem(LOCAL_STORAGE_ITEM_NAME, "true");
      return true;
    } else if (storageItem === "true" && !this.isDismissed) {
      return true;
    } else return false;
  }
  /**
   * The action called when the user clicks the dismiss button.
   * Sets the local storage item to false and sets the isDismissed
   * property to true so the banner is immediately hidden.
   */
  @action protected dismiss() {
    window.localStorage.setItem(LOCAL_STORAGE_ITEM_NAME, "false");
    this.isDismissed = true;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Dashboard::NewFeaturesBanner": typeof DashboardNewFeaturesBanner;
  }
}
