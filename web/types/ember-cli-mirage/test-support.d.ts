import { Server } from "ember-cli-mirage";
import { TestContext } from "ember-test-helpers";

export function setupMirage(hooks: NestedHooks): void;

// Lets you use `this.server` in Mirage tests.
export interface MirageTestContext extends TestContext {
  server: Server;
  set<T>(key: string, value: T): T;
  setProperties<T extends Record<string, unknown>>(hash: T): T;
  get(key: string): unknown;
  getProperties(...args: string[]): Record<string, unknown>;
  pauseTest(): Promise<void>;
}
