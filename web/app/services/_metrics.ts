import { getOwner, setOwner } from "@ember/application";
import { assert } from "@ember/debug";
import { service } from "@ember/service";
import EmberMetricsService from "ember-metrics/services/metrics";
import GoogleAnalyticsFourAdapter from "hermes/metrics-adapters/_google-analytics-four";
import ConfigService from "./config";

export default class MetricsService extends EmberMetricsService {
  @service("config") declare configSvc: ConfigService;

  /**
   * We extend EmberMetricsService to resolve a bug in its `_activateAdapter` method.
   * https://github.com/adopted-ember-addons/ember-metrics/issues/541
   */
  _activateAdapter({
    adapterClass,
    config,
  }: {
    adapterClass: typeof GoogleAnalyticsFourAdapter;
    config: {};
  }) {
    const adapter = new adapterClass(config);
    let owner = getOwner(this);
    assert("ember metrics expects an owner", owner);
    setOwner(adapter, owner);
    adapter.install();
    return adapter;
  }
}
