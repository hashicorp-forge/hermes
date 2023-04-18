// https://github.com/adopted-ember-addons/ember-metrics/blob/master/addon/services/metrics.js

import Service from "@ember/service";

declare module "ember-metrics/services/metrics" {
  // Note: Incomplete types; only the methods we use are defined.
  export default class EmberMetricsService extends Service {
    _adapters: any;
    _options: any;
    _activateAdapter({}): unknown;
    _lookupAdapter(adapterName: string): any;
    trackPage(): void;
  }
}
