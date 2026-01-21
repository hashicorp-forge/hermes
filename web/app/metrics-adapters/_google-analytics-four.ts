import { service } from "@ember/service";
import GoogleAnalyticsFour from "ember-metrics/metrics-adapters/google-analytics-four";
import ConfigService from "hermes/services/config";

declare global {
  interface Window {
    dataLayer: any[];
  }
}

export default class GoogleAnalyticsFourAdapter extends GoogleAnalyticsFour {
  @service("config") declare configSvc: ConfigService;

  /**
   * Modified from its parent class:
   * https://github.com/adopted-ember-addons/ember-metrics/blob/01bb65e68f565fc48c2fa252d17a1b7d3d099e68/addon/metrics-adapters/google-analytics-four.js#L11-L28
   */
  install(): void {
    const GoogleAnalyticsTagID =
      this.config.id || this.configSvc.config.google_analytics_tag_id;

    if (!GoogleAnalyticsTagID) {
      return;
    }

    this.options = {
      id: GoogleAnalyticsTagID,
      send_page_view: true,
      anonymize_ip: true,
    };

    this._injectScript(GoogleAnalyticsTagID);

    window.dataLayer = window.dataLayer || [];

    this.gtag("js", new Date());
    this.gtag("config", GoogleAnalyticsTagID, this.options);
  }
}
