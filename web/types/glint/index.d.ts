import "@glint/environment-ember-loose";
import PerformHelper from "ember-concurrency/helpers/perform";
import OnDocumentHelper from "ember-on-helper/helpers/on-document";
import DidInsertModifier from "ember-render-modifiers/modifiers/did-insert";
import WillDestroyModifier from "ember-render-modifiers/modifiers/will-destroy";
import AndHelper from "ember-truth-helpers/helpers/and";
import EqHelper from "ember-truth-helpers/helpers/eq";
import IsEmptyHelper from "ember-truth-helpers/helpers/is-empty";
import LtHelper from "ember-truth-helpers/helpers/lt";
import NotHelper from "ember-truth-helpers/helpers/not";
import OrHelper from "ember-truth-helpers/helpers/or";
import { FlightIconComponent } from "hds/flight-icon";

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "did-insert": typeof DidInsertModifier;
    "will-destroy": typeof WillDestroyModifier;
    "on-document": typeof OnDocumentHelper;
    perform: typeof PerformHelper;
    or: typeof OrHelper;
    eq: typeof EqHelper;
    and: typeof AndHelper;
    not: typeof NotHelper;
    lt: typeof LtHelper
    "is-empty": IsEmptyHelper;
    FlightIcon: FlightIconComponent;
  }
}
