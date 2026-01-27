import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import window from "ember-window-mock";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
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
   * PERMANENT MIGRATION BANNER - Always shown, cannot be dismissed
   */
  protected get isShown(): boolean {
    // Always return true for permanent banner
    return true;
  }

  /**
   * PERMANENT BANNER - No dismiss action needed
   * This action is removed for permanent migration banner
   */
  @action protected dismiss() {
    // No-op for permanent banner - cannot be dismissed
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Dashboard::NewFeaturesBanner": typeof DashboardNewFeaturesBanner;
  }
}
