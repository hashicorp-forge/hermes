import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import GoogleAnalyticsFour from "ember-metrics/metrics-adapters/google-analytics-four";

declare global {
  interface Window {
    dataLayer: any[];
  }
}

export default class GoogleAnalyticsFourAdapter extends GoogleAnalyticsFour {
  @service("config") declare configSvc: ConfigService;

  constructor(config: any) {
    super(config);
  }

  /**
   * Modified from its parent class:
   * https://github.com/adopted-ember-addons/ember-metrics/blob/master/addon/metrics-adapters/google-analytics-four.js#L11-L28
   */
  install(): void {
    const GoogleAnalyticsTagID = this.configSvc.config.google_analytics_tag_id;

    if (!GoogleAnalyticsTagID) {
      return;
    }

    this.options = {
      id: GoogleAnalyticsTagID,
      anonymize_ip: true,
    };

    this._injectScript(GoogleAnalyticsTagID);

    window.dataLayer = window.dataLayer || [];

    this.gtag("js", new Date());
    this.gtag("config", GoogleAnalyticsTagID, this.options);
  }
}
