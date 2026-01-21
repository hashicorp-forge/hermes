import "@glint/environment-ember-loose";
import "@glint/environment-ember-template-imports";
import EmberPageTitleHelper from "ember-page-title";
import PerformHelper from "ember-concurrency/helpers/perform";
import OnDocumentHelper from "ember-on-helper/helpers/on-document";
import OnWindowHelper from "ember-on-helper/helpers/on-window";
import DidInsertModifier from "ember-render-modifiers/modifiers/did-insert";
import WillDestroyModifier from "ember-render-modifiers/modifiers/will-destroy";
import AndHelper from "ember-truth-helpers/helpers/and";
import EqHelper from "ember-truth-helpers/helpers/eq";
import IsEmptyHelper from "ember-truth-helpers/helpers/is-empty";
import LtHelper from "ember-truth-helpers/helpers/lt";
import GtHelper from "ember-truth-helpers/helpers/gt";
import NotHelper from "ember-truth-helpers/helpers/not";
import OrHelper from "ember-truth-helpers/helpers/or";
import EmberSetBodyClassHelper from "ember-set-body-class";
import { FlightIconComponent } from "hds/flight-icon";
import { HdsButtonComponent } from "hds/button";
import { HdsBadgeCountComponent } from "hds/badge-count";
import { HdsFormTextInputBaseComponent } from "hds/form/text-input/base";
import { HdsFormTextInputFieldComponent } from "hds/form/text-input/field";
import { HdsAlertComponent } from "hds/alert";
import { HdsLinkInlineComponent } from "hds/link/inline";
import { HdsLinkStandaloneComponent } from "hds/link/standalone";
import { HdsModalComponent } from "hds/modal";
import { HdsFormCheckboxFieldComponent } from "hds/form/checkbox/fields";
import { HdsFormTextareaFieldComponent } from "hds/form/textarea/field";
import { HdsFormToggleBaseComponent } from "hds/form/toggle/base";
import { HdsFormFieldComponent } from "hds/form/field";
import { HdsToastComponent } from "hds/toast";
import { HdsBadgeComponent } from "hds/badge";
import { HdsButtonSetComponent } from "hds/button-set";
import { HdsIconTileComponent } from "hds/icon-tile";
import { HdsCardContainerComponent } from "hds/card/container";
import { HdsTableTdComponent } from "hds/table/td";
import { HdsTableTrComponent } from "hds/table/tr";
import { HdsTableComponent } from "hds/table";
// TEMPORARY: Using local stubs for ember-animated during Ember 6.x upgrade
import AnimatedContainer from "hermes/components/animated-container";
import { AnimatedIfCurly } from "hermes/components/animated-if";
import { AnimatedEachCurly } from "hermes/components/animated-each";
// TODO: Create stubs for these if needed (currently unused in templates)
// import AnimatedValue from "ember-animated/components/animated-value";
// import AnimatedOrphans from "ember-animated/components/animated-orphans";
// import AnimatedTools from "ember-animated-tools/components/animated-tools";
import { FlashMessageComponent } from "ember-cli-flash/flash-message";
import { HdsFormErrorComponent } from "hds/form/error";
import PowerSelectMultiple from "ember-power-select/components/power-select-multiple";
import { HdsFormLabelComponent } from "hds/form/label";

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "page-title": typeof EmberPageTitleHelper;
    "did-insert": typeof DidInsertModifier;
    "will-destroy": typeof WillDestroyModifier;
    "on-document": typeof OnDocumentHelper;
    "on-window": typeof OnWindowHelper;
    "set-body-class": typeof EmberSetBodyClassHelper;
    AnimatedContainer: typeof AnimatedContainer;
    // AnimatedValue: typeof AnimatedValue;  // TODO: Create stub if needed
    // AnimatedOrphans: typeof AnimatedOrphans;  // TODO: Create stub if needed
    // AnimatedTools: typeof AnimatedTools;  // TODO: Create stub if needed
    "animated-each": typeof AnimatedEachCurly;
    "animated-if": typeof AnimatedIfCurly;
    PowerSelectMultiple: typeof PowerSelectMultiple;
    perform: typeof PerformHelper;
    or: typeof OrHelper;
    eq: typeof EqHelper;
    and: typeof AndHelper;
    not: typeof NotHelper;
    lt: typeof LtHelper;
    gt: typeof GtHelper;
    "is-empty": IsEmptyHelper;
    FlashMessage: FlashMessageComponent;
    FlightIcon: FlightIconComponent;
    "Hds::Button": HdsButtonComponent;
    "Hds::BadgeCount": HdsBadgeCountComponent;
    "Hds::Form::TextInput::Base": HdsFormTextInputBaseComponent;
    "Hds::Form::TextInput::Field": HdsFormTextInputFieldComponent;
    "Hds::Alert": HdsAlertComponent;
    "Hds::Link::Inline": HdsLinkInlineComponent;
    "Hds::Link::Standalone": HdsLinkStandaloneComponent;
    "Hds::Modal": HdsModalComponent;
    "Hds::Form::Error": HdsFormErrorComponent;
    "Hds::Form::Checkbox::Field": HdsFormCheckboxFieldComponent;
    "Hds::Form::Textarea::Field": HdsFormTextareaFieldComponent;
    "Hds::Form::Toggle::Base": HdsFormToggleBaseComponent;
    "Hds::Form::Field": HdsFormFieldComponent;
    "Hds::Form::Label": HdsFormLabelComponent;
    "Hds::Toast": HdsToastComponent;
    "Hds::Badge": HdsBadgeComponent;
    "Hds::ButtonSet": HdsButtonSetComponent;
    "Hds::IconTile": HdsIconTileComponent;
    "Hds::Card::Container": HdsCardContainerComponent;
    "Hds::Table::Td": HdsTableTdComponent;
    "Hds::Table::Tr": HdsTableTrComponent;
    "Hds::Table": HdsTableComponent;
  }
}
