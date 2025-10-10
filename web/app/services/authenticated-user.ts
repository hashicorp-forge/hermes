import Service from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { service } from "@ember/service";
import { assert } from "@ember/debug";
import { task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";
import SessionService from "./session";
import StoreService from "./store";
import PersonModel from "hermes/models/person";

export interface Subscription {
  productArea: string;
  subscriptionType: SubscriptionType;
}

enum SubscriptionType {
  Digest = "digest",
  Instant = "instant",
}

export default class AuthenticatedUserService extends Service {
  @service("fetch") declare fetchSvc: FetchService;
  @service declare session: SessionService;
  @service declare store: StoreService;

  @tracked subscriptions: Subscription[] | null = null;
  @tracked _info: PersonModel | null = null;

  get info(): PersonModel | null {
    // Note: When using Dex authentication without OIDC flow, user info may not be loaded
    // Return null instead of asserting to prevent application crashes
    return this._info;
  }

  /**
   * Returns the user's subscriptions as a JSON string.
   * E.g., '{"subscriptions":["Customer Success", "Terraform"]}'
   * Used in POST requests to the subscriptions endpoint.
   */
  private get subscriptionsPostBody(): string {
    assert("subscriptions must be defined", this.subscriptions);
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
   * Loads the user's info from the API endpoint.
   * Called by `session.handleAuthentication` and `authenticated.afterModel`.
   * Ensures `authenticatedUser.info` is always defined and up-to-date
   * in any route that needs it. On error, bubbles up to the application route.
   */
  loadInfo = task(async () => {
    console.log('[AuthenticatedUser] 🔄 Starting loadInfo task...');
    try {
      // Fetch user info directly from the /me endpoint
      console.log('[AuthenticatedUser] 📡 Fetching user info from /api/v2/me');
      const response = await fetch(
        "/api/v2/me",
        {
          method: "GET",
          credentials: "include", // Include session cookies for Dex auth
        },
      );

      console.log('[AuthenticatedUser] 📬 Response status:', response.status, response.statusText);

      if (!response.ok) {
        console.error('[AuthenticatedUser] ❌ Failed to fetch user info:', response.statusText);
        throw new Error(`Failed to fetch user info: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[AuthenticatedUser] 📦 User data received:', data);

      // Create or update the person record in the store
      console.log('[AuthenticatedUser] 🔍 Looking for existing person record:', data.email);
      let person = this.store.peekRecord("person", data.email);
      if (!person) {
        console.log('[AuthenticatedUser] ➕ Creating new person record');
        person = this.store.createRecord("person", {
          id: data.email,
          email: data.email,
          name: data.name,
          firstName: data.given_name,
          picture: data.picture,
        });
      } else {
        console.log('[AuthenticatedUser] ♻️ Updating existing person record');
        // Update existing record
        person.setProperties({
          name: data.name,
          firstName: data.given_name,
          picture: data.picture,
        });
      }

      this._info = person;
      console.log('[AuthenticatedUser] ✅ User info loaded successfully:', person.email);
    } catch (e: unknown) {
      console.error("[AuthenticatedUser] ❌ Error getting user information: ", e);
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
        .fetch("/api/v2/me/subscriptions", {
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
      console.error("Error loading subscriptions: ", e);
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
      assert(
        "removeSubscription expects a valid subscriptions array",
        this.subscriptions,
      );

      let cached = this.subscriptions;

      this.subscriptions.push({
        productArea,
        subscriptionType,
      });

      try {
        await this.fetchSvc.fetch(
          "/api/v2/me/subscriptions",
          {
            method: "POST",
            headers: this.subscriptionsPostHeaders,
            body: this.subscriptionsPostBody,
          },
        );
      } catch (e: unknown) {
        console.error("Error updating subscriptions: ", e);
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
      assert(
        "removeSubscription expects a subscriptions array",
        this.subscriptions,
      );

      let cached = this.subscriptions;
      let subscriptionToRemove = this.subscriptions.find(
        (subscription) => subscription.productArea === productArea,
      );

      assert(
        "removeSubscription expects a valid productArea",
        subscriptionToRemove,
      );

      const indexToRemove = this.subscriptions.indexOf(subscriptionToRemove);
      if (indexToRemove > -1) {
        this.subscriptions.splice(indexToRemove, 1);
      }

      try {
        await this.fetchSvc.fetch(
          "/api/v2/me/subscriptions",
          {
            method: "POST",
            headers: this.subscriptionsPostHeaders,
            body: this.subscriptionsPostBody,
          },
        );
      } catch (e: unknown) {
        console.error("Error updating subscriptions: ", e);
        this.subscriptions = cached;
        throw e;
      }
    },
  );
}
