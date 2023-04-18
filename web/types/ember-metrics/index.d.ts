// https://github.com/adopted-ember-addons/ember-metrics/blob/master/addon/services/metrics.js

import Service from "@ember/service";

declare module "ember-metrics/index" {
  // Note: Incomplete types; only the methods we use are defined.
  export default class EmberMetricsService extends Service {
    trackPage(): void;
  }
}
