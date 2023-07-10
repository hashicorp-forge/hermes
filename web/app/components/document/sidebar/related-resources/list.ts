import Component from "@glimmer/component";
import move from "ember-animated/motions/move";
import animateScale from "hermes/utils/ember-animated/animate-scale";
import { easeOutQuad } from "hermes/utils/ember-animated/easings";
import { TransitionContext, wait } from "ember-animated/.";
import { fadeIn, fadeOut } from "ember-animated/motions/opacity";
import { action } from "@ember/object";
import { Transition } from "ember-animated/-private/transition";

interface DocumentSidebarRelatedResourcesListComponentSignature {
  Element: HTMLUListElement;
  Args: {
    items: any[];
    itemLimit?: number;
  };
  Blocks: {
    resource: [resource: any];
  };
}

export function* emptyTransition(context: TransitionContext) {}

export default class DocumentSidebarRelatedResourcesListComponent extends Component<DocumentSidebarRelatedResourcesListComponentSignature> {
  shouldAnimate = false;

  get listIsEmpty() {
    return this.args.items.length === 0;
  }

  @action protected didInsert() {
    this.shouldAnimate = true;
  }

  @action transitionRules({
    firstTime,
    oldItems,
    newItems,
  }: {
    firstTime: boolean;
    oldItems: unknown[];
    newItems: unknown[];
  }): Transition {
    if (firstTime) {
      if (this.shouldAnimate === false) {
        return emptyTransition;
      }
    }
    return this.transition;
  }

  *transition({
    insertedSprites,
    keptSprites,
    removedSprites,
  }: TransitionContext) {
    for (let sprite of keptSprites) {
      void move(sprite, { duration: 250, easing: easeOutQuad });
    }

    for (let sprite of removedSprites) {
      void fadeOut(sprite, { duration: 0 });
    }

    yield wait(100);
    for (let sprite of insertedSprites) {
      sprite.applyStyles({
        opacity: "0",
      });
      void animateScale(sprite, {
        from: 0.95,
        to: 1,
        duration: 200,
        easing: easeOutQuad,
      });
      void fadeIn(sprite, { duration: 50 });
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources::List": typeof DocumentSidebarRelatedResourcesListComponent;
  }
}
