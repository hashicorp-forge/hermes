import { assert } from "@ember/debug";
import { Server } from "miragejs";
/**
 * Provides access to the Mirage server outside of test contexts (e.g. in a Factory).
 * If you are in a test, use MirageTestContext instead.
 */
export const MirageContext = {
  get server(): Server {
    let { server } = window as { server?: Server };
    assert("Expected a global `server` but found none", server);
    return server;
  },
};
