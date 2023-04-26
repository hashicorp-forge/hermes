interface BaseMetricsAdapter {
  constructor(config: any);
  install(): void;
}

declare module "ember-metrics/metrics-adapters/google-analytics-four" {
  export default class GoogleAnalyticsFour extends BaseMetricsAdapter {
    constructor(config: any);
    install(): void;
    gtag(...args: any[]): void;
    options: any;
    config: {
      id: string;
    };
    _injectScript(GoogleAnalyticsTagID: string): void;
  }
}
