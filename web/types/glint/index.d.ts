import "@glint/environment-ember-loose";

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "did-insert": typeof import("@gavant/glint-template-types/types/ember-render-modifiers/did-insert").default;
    "on-document": typeof import("@gavant/glint-template-types/types/ember-on-helper/on-document").default;
    perform: typeof import("@gavant/glint-template-types/types/ember-concurrency/perform").default;
    or: typeof import("@gavant/glint-template-types/types/ember-truth-helpers/or").default;
    eq: typeof import("@gavant/glint-template-types/types/ember-truth-helpers/eq").default;
    and: typeof import("@gavant/glint-template-types/types/ember-truth-helpers/and").default;
    not: typeof import("@gavant/glint-template-types/types/ember-truth-helpers/not").default;
    "is-empty": typeof import("@gavant/glint-template-types/types/ember-truth-helpers/is-empty").default;
  }
}
