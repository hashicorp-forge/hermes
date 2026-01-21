import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import window from "ember-window-mock";
import { action } from "@ember/object";
import { service } from "@ember/service";
import ConfigService from "hermes/services/config";

export const NEW_FEATURES_BANNER_LOCAL_STORAGE_ITEM =
  "apr-12-2024-newFeatureBannerIsShown";

interface DashboardNewFeaturesBannerSignature {
  Args: {};
}

export default class DashboardNewFeaturesBanner extends Component<DashboardNewFeaturesBannerSignature> {
  /**
   * Used to determine whether the Google Groups callout should be shown.
   */
  @service("config") declare configSvc: ConfigService;

  @tracked protected isDismissed = false;

  /**
   * Whether the banner should be shown.
   * Set true on first visit to the dashboard and remains true
   * until the user dismisses the banner.
   */
  protected get isShown(): boolean {
    /**
     * If the banner has been dismissed, don't show it.
     * This check causes the property to recompute when dismissed.
     */
    if (this.isDismissed) {
      return false;
    }

    const storageItem = window.localStorage.getItem(
      NEW_FEATURES_BANNER_LOCAL_STORAGE_ITEM,
    );

    if (storageItem === null) {
      window.localStorage.setItem(
        NEW_FEATURES_BANNER_LOCAL_STORAGE_ITEM,
        "true",
      );
      return true;
    } else if (storageItem === "true") {
      return true;
    } else return false;
  }

  /**
   * The action called when the user clicks the dismiss button.
   * Sets the local storage item to false and sets the isDismissed
   * property to true so the banner is immediately hidden.
   */
  @action protected dismiss() {
    window.localStorage.setItem(
      NEW_FEATURES_BANNER_LOCAL_STORAGE_ITEM,
      "false",
    );
    this.isDismissed = true;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Dashboard::NewFeaturesBanner": typeof DashboardNewFeaturesBanner;
  }
}
