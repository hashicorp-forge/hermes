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

  install(): void {
    const GoogleAnalyticsTagID = this.configSvc.config.google_analytics_tag_id;

    if (!GoogleAnalyticsTagID) {
      return;
    }

    this.options = {
      id: GoogleAnalyticsTagID,
      anonymize_ip: true,
    };

    // The rest is copied from the parent class:
    // https://github.com/adopted-ember-addons/ember-metrics/blob/master/addon/metrics-adapters/google-analytics-four.js#L24-L28

    this._injectScript(GoogleAnalyticsTagID);

    window.dataLayer = window.dataLayer || [];

    this.gtag("js", new Date());
    this.gtag("config", GoogleAnalyticsTagID, this.options);
  }
}
