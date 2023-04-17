import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import GoogleAnalyticsFour from "ember-metrics/metrics-adapters/google-analytics-four";
import { compact } from "ember-metrics/-private/utils/object-transforms";

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
      console.log("Google Analytics Tag ID not set");
      return;
    }

      console.log("Google Analytics Tagged!!");
    this.options = {
      id: GoogleAnalyticsTagID,
      anonymize_ip: true,
    };

    this._injectScript(GoogleAnalyticsTagID);

    window.dataLayer = window.dataLayer || [];

    this.gtag("js", new Date());
    this.gtag("config", GoogleAnalyticsTagID, compact(this.options));
  }
}
