import RequestManager from '@ember-data/request';
import { LegacyNetworkHandler } from '@ember-data/legacy-compat';

// @ts-ignore - RequestManager constructor signature
export default class AppRequestManager extends RequestManager {
  constructor(createArgs: any) {
    // @ts-ignore - super call with createArgs
    super(createArgs);
    // @ts-ignore - use method
    this.use([LegacyNetworkHandler]);
  }
}

declare module '@ember/service' {
  interface Registry {
    'request-manager': AppRequestManager;
  }
}
