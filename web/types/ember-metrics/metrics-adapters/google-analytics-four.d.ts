interface BaseMetricsAdapter {
  constructor(config: any);
  install(): void;
}

declare module "ember-metrics/metrics-adapters/google-analytics-four" {
  export default class GoogleAnalyticsFourAdapter extends BaseMetricsAdapter {
    options: any;

    _injectScript(GoogleAnalyticsTagID: string): void;

    gtag(...args: any[]): void;
    install(): void;
    constructor(config: any);
  }
}
