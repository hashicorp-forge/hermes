import Component from "@glimmer/component";
import { RelatedResource } from "../related-resources";
import { action } from "@ember/object";
import { TransitionRules } from "ember-animated/transition-rules";
import { emptyTransition } from "hermes/utils/ember-animated/empty-transition";
import { TransitionContext, wait } from "ember-animated/.";
import move from "ember-animated/motions/move";
import { fadeIn, fadeOut } from "ember-animated/motions/opacity";
import { easeOutExpo, easeOutQuad } from "hermes/utils/ember-animated/easings";
import Ember from "ember";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";

interface ProjectResourceListComponentSignature {
  Element: HTMLDivElement;
  Args: {
    items: RelatedResource[];
    shouldAnimate: boolean;
    motion: unknown;
  };
  Blocks: {
    header: [];
    item: [
      {
        item: RelatedResource;
        index: number;
      },
    ];
  };
}

export default class ProjectResourceListComponent extends Component<ProjectResourceListComponentSignature> {
  @service declare router: RouterService;

  /**
   * Whether the badge should be shown.
   * If there are items, the badge should be shown.
   * If there are no items, the badge should not be shown.
   */
  protected get badgeIsShown() {
    return this.args.items.length > 0;
  }

  /**
   * The number to display in the badge, if it's visible.
   * Uses the passed-in count if it's greater than 0, otherwise
   * displays 1 for a more natural fade-out transition.
   */
  protected get badgeCount(): string {
    if (!this.badgeIsShown) {
      // This is the case in animate-out transitions
      return "1";
    } else {
      return `${this.args.items.length}`;
    }
  }

  @action protected badgeTransitionRules() {
    if (this.args.shouldAnimate) {
      return this.badgeTransition;
    } else {
      return emptyTransition;
    }
  }

  @action protected sectionTransitionRules({
    oldItems,
    newItems,
  }: TransitionRules) {
    if (this.args.shouldAnimate) {
      // ignore animation when leaving the project
      if (!!oldItems[0] && newItems[0] === undefined) {
        return emptyTransition;
      }

      // handle the case of the first item being added
      if (newItems[0] === true && oldItems[0] === false) {
        return this.addFirstResourceTransition;
      }

      // handle the case where the section is emptying
      if (newItems[0] === false && oldItems[0] === true) {
        return this.removeLastResourceTransition;
      }
    }

    return emptyTransition;
  }

  @action protected listTransitionRules() {
    if (this.args.shouldAnimate) {
      // ignore animation when leaving the project
      if (!this.router.currentRouteName.includes("projects.project")) {
        return emptyTransition;
      }
      return this.listTransition;
    } else {
      return emptyTransition;
    }
  }

  *badgeTransition({ insertedSprites, removedSprites }: TransitionContext) {
    if (Ember.testing) {
      return;
    }

    // TODO: this should have some timing logic beyond the component

    // Animate in
    for (let sprite of insertedSprites) {
      sprite.startTranslatedBy(-3, 0);
      yield wait(300);
      void move(sprite, { duration: 500, easing: easeOutExpo });
      void fadeIn(sprite, { duration: 80 });
    }

    // Animate out
    for (let sprite of removedSprites) {
      sprite.endTranslatedBy(-2, 0);
      void move(sprite, { duration: 110, easing: easeOutQuad });
      yield wait(20);
      void fadeOut(sprite, { duration: 60 });
    }
  }

  *addFirstResourceTransition({
    insertedSprites,
    removedSprites,
  }: TransitionContext) {
    if (Ember.testing) {
      return;
    }

    // Remove the empty state ("None")
    for (let sprite of removedSprites) {
      sprite.endTranslatedBy(0, 10);
      void move(sprite, { duration: 120, easing: easeOutQuad });
      void fadeOut(sprite, { duration: 120 });
    }

    // Insert the resource list right away;
    // the `each` transition will handle fadeIns
    for (let sprite of insertedSprites) {
      sprite.reveal();
    }
  }

  *removeLastResourceTransition({
    insertedSprites,
    removedSprites,
  }: TransitionContext) {
    if (Ember.testing) {
      return;
    }

    for (let sprite of removedSprites) {
      // void fadeOut(sprite, { duration: 1000 });
    }

    for (let sprite of insertedSprites) {
      yield wait(50);
      sprite.startTranslatedBy(0, 10);
      void move(sprite, { duration: 200, easing: easeOutQuad });
      void fadeIn(sprite, { duration: 100 });
    }
  }

  *listTransition({
    insertedSprites,
    keptSprites,
    removedSprites,
  }: TransitionContext) {
    if (Ember.testing) {
      return;
    }

    for (let sprite of removedSprites) {
      void fadeOut(sprite, { duration: 80 });
    }

    for (let sprite of keptSprites) {
      // Ensure keptSprites overlay removedSprites for a cleaner animation
      sprite.applyStyles({
        "z-index": "1",
      });
      void move(sprite, { duration: 300, easing: easeOutQuad });
    }

    for (let sprite of insertedSprites) {
      yield wait(150);

      void fadeIn(sprite, { duration: 80 });
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::ResourceList": typeof ProjectResourceListComponent;
  }
}
