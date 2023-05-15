import "@glint/environment-ember-loose";

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "did-insert": typeof import("@gavant/glint-template-types/types/ember-render-modifiers/did-insert").default;
  }
}
