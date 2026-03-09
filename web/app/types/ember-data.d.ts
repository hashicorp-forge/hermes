declare module '@ember-data/request' {
  const RequestManager: any;
  export default RequestManager;
  export * from '@ember-data/request/index';
}

declare module '@ember-data/legacy-compat' {
  export const LegacyNetworkHandler: any;
  export const adapterFor: any;
  export const serializerFor: any;
  export const pushPayload: any;
  export const normalize: any;
  export const serializeRecord: any;
  export const cleanup: any;
  export * from '@ember-data/legacy-compat/index';
}
