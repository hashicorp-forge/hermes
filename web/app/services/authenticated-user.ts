import Service from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import Store from "@ember-data/store";
import { assert } from "@ember/debug";
import { restartableTask, task } from "ember-concurrency";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import SessionService from "./session";

export interface AuthenticatedUser {
  name: string;
  email: string;
  given_name: string;
  picture: string;
  subscriptions: Subscription[];
}

export interface Subscription {
  productArea: string;
  subscriptionType: SubscriptionType;
}

export enum SubscriptionType {
  Digest = "digest",
  Instant = "instant",
}

export default class AuthenticatedUserService extends Service {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare session: SessionService;
  @service declare store: Store;

  @tracked subscriptions: Subscription[] | null = null;
  @tracked _info: AuthenticatedUser | null = null;

  get info(): AuthenticatedUser {
    assert("user info must exist", this._info);
    return this._info;
  }

  /**
   * Loads the user's info from the Google API.
   * Called by `session.handleAuthentication` and `authenticated.afterModel`.
   * Ensures `authenticatedUser.info` is always defined and up-to-date
   * in any route that needs it. On error, bubbles up to the application route.
   */
  loadInfo = task(async () => {
    try {
      this._info = await this.fetchSvc
        .fetch(`/api/${this.configSvc.config.api_version}/me`)
        .then((response) => response?.json());
    } catch (e: unknown) {
      console.error("Error getting user information: ", e);
      throw e;
    }
  });

  /**
   * Loads the user's subscriptions from the API.
   * If the user has no subscriptions, returns an empty array.
   */
  fetchSubscriptions = task(async () => {
    const cached = this.subscriptions;
    try {
      this.subscriptions = await this.fetchSvc
        .fetch(`/api/${this.configSvc.config.api_version}/me/subscriptions`, {
          method: "GET",
        })
        .then((response) => response?.json());
    } catch (e: unknown) {
      this.subscriptions = cached;
      console.error("Error loading subscriptions: ", e);
      throw e;
    }
  });

  setSubscription = restartableTask(
    async (productArea: string, subscriptionType?: SubscriptionType) => {
      assert("subscriptions must exist", this.subscriptions);

      const cached = this.subscriptions.slice();

      const existingSubscription = this.subscriptions.find(
        (subscription) => subscription.productArea === productArea,
      );

      if (existingSubscription) {
        if (subscriptionType === undefined) {
          // remove the existing subscription
          this.subscriptions.removeObject(existingSubscription);
        } else {
          // update the existing subscription
          existingSubscription.subscriptionType = subscriptionType;

          // updating an array object doesn't cause a re-render,
          // so we save it manually to trigger one
          this.subscriptions = this.subscriptions;
        }
      } else {
        // already unsubscribed; ignore
        if (subscriptionType === undefined) {
          return;
        }
        // add the new subscription
        this.subscriptions.addObject({
          productArea,
          subscriptionType: subscriptionType ?? SubscriptionType.Instant,
        });
      }

      try {
        await this.fetchSvc.fetch(
          `/api/${this.configSvc.config.api_version}/me/subscriptions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subscriptions: this.subscriptions,
            }),
          },
        );
      } catch (e: unknown) {
        this.subscriptions = cached;
        // TODO: flash message
        console.error("Error updating subscriptions: ", e);
      }
    },
  );
}
