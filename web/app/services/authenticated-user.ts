import Service from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import { assert } from "@ember/debug";
import { task } from "ember-concurrency";
import type ConfigService from "hermes/services/config";
import type FetchService from "hermes/services/fetch";
import type SessionService from "./session";
import type StoreService from "./store";
import type PersonModel from "hermes/models/person";

export interface Subscription {
  productArea: string;
  subscriptionType: SubscriptionType;
}

enum SubscriptionType {
  Digest = "digest",
  Instant = "instant",
}

export default class AuthenticatedUserService extends Service {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare session: SessionService;
  @service declare store: StoreService;

  @tracked subscriptions: Subscription[] = [];
  @tracked _info: PersonModel | null = null;

  get info(): PersonModel {
    assert("user info must exist", this._info);
    return this._info;
  }

  /**
   * Returns the user's subscriptions as a JSON string.
   * E.g., '{"subscriptions":["Customer Success", "Terraform"]}'
   * Used in POST requests to the subscriptions endpoint.
   */
  private get subscriptionsPostBody(): string {
    let subscriptions = this.subscriptions.map(
      (subscription: Subscription) => subscription.productArea,
    );
    return JSON.stringify({ subscriptions });
  }

  /**
   * The headers to use in POST requests to the subscriptions endpoint.
   */
  private get subscriptionsPostHeaders() {
    return {
      "Content-Type": "application/json",
    };
  }

  /**
   * Loads the user's info from the API.
   * Called by `session.handleAuthentication` and `authenticated.afterModel`.
   * Ensures `authenticatedUser.info` is always defined and up-to-date
   * in any route that needs it. On error, bubbles up to the application route.
   */
  loadInfo = task(async () => {
    try {
      // Use queryRecord instead of findAll since /api/v2/me returns a single object, not an array
      const me = await this.store.queryRecord("me", {});

      assert("me must exist", me);

      // Grab the person record created by the serializer
      const person = this.store.peekRecord("person", me.id);
      assert("person must exist", person);

      this._info = person;
    } catch (e: unknown) {
      throw e;
    }
  });

  /**
   * Loads the user's subscriptions from the API.
   * If the user has no subscriptions, returns an empty array.
   */
  fetchSubscriptions = task(async () => {
    try {
      let subscriptions = await this.fetchSvc
        .fetch(`/api/${this.configSvc.config.api_version}/me/subscriptions`, {
          method: "GET",
        })
        .then((response) => response?.json());

      let newSubscriptions: Subscription[] = [];

      if (subscriptions) {
        newSubscriptions = subscriptions.map((subscription: string) => {
          return {
            productArea: subscription,
            subscriptionType: SubscriptionType.Instant,
          };
        });
      }
      this.subscriptions = newSubscriptions;
    } catch (e: unknown) {
      throw e;
    }
  });

  /**
   * Adds a subscription and saves the subscription index.
   * Subscriptions default to the "instant" subscription type.
   */
  addSubscription = task(
    async (
      productArea: string,
      subscriptionType = SubscriptionType.Instant,
    ) => {
      let cached = [...this.subscriptions];

      this.subscriptions = [
        ...this.subscriptions,
        {
          productArea,
          subscriptionType,
        },
      ];

      try {
        await this.fetchSvc.fetch(
          `/api/${this.configSvc.config.api_version}/me/subscriptions`,
          {
            method: "POST",
            headers: this.subscriptionsPostHeaders,
            body: this.subscriptionsPostBody,
          },
        );
      } catch (e: unknown) {
        this.subscriptions = cached;
        throw e;
      }
    },
  );

  /**
   * Removes a subscription and saves the subscription index.
   */
  removeSubscription = task(
    async (
      productArea: string,
      subscriptionType = SubscriptionType.Instant,
    ) => {
      // make a shallow copy for rollback if the network request fails
      let cached = [...this.subscriptions];

      let subscriptionToRemove = this.subscriptions.find(
        (subscription) => subscription.productArea === productArea,
      );
      assert(
        "removeSubscription expects a valid productArea",
        subscriptionToRemove,
      );

      // Create a new array without the removed subscription so @tracked notices the change
      this.subscriptions = this.subscriptions.filter(
        (s) => s !== subscriptionToRemove,
      );

      try {
        await this.fetchSvc.fetch(
          `/api/${this.configSvc.config.api_version}/me/subscriptions`,
          {
            method: "POST",
            headers: this.subscriptionsPostHeaders,
            body: this.subscriptionsPostBody,
          },
        );
      } catch (e: unknown) {
        this.subscriptions = cached;
        throw e;
      }
    },
  );
}
