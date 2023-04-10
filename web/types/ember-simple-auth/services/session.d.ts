// Reference: https://github.com/mainmatter/ember-simple-auth/blob/master/packages/ember-simple-auth/addon/services/session.js

import Service from "@ember/service";
import Evented from "@ember/object/evented";
import Transition from "@ember/routing/transition";

export interface Data {
  authenticated: {
    access_token: string;
  };
}

export interface Callback {
  (): void;
}

declare module "ember-simple-auth/services/session" {
  export default class EmberSimpleAuthSessionService extends Service {
    data: Data;
    setup(): Promise<void>;
    authenticate(...args: any[]): RSVP.Promise;
    invalidate(...args: any): RSVP.Promise;
    requireAuthentication(
      transition: Transition | null,
      routeOrCallback: string | Callback
    ): boolean;
    prohibitAuthentication(routeOrCallback: string | Callback): boolean;
  }
}
