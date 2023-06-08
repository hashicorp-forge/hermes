declare module "ember-simple-auth/test-support" {
  import { SessionAuthenticatedData } from "ember-simple-auth/services/session";
  export function authenticateSession(
    responseFromApi: SessionAuthenticatedData
  ): Promise<void>;
  export function invalidateSession(): Promise<void>;
}
