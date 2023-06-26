import Component from "@glimmer/component";
import move from "ember-animated/motions/move";
import animateScale from "hermes/utils/ember-animated/animate-scale";
import { easeOutQuad } from "hermes/utils/ember-animated/easings";
import { TransitionContext, wait } from "ember-animated/.";
import { fadeIn, fadeOut } from "ember-animated/motions/opacity";

interface DocumentSidebarResourceListComponentSignature {
  Element: HTMLUListElement;
  Args: {
    items: any;
  };
  Blocks: {
    resource: [resource: any];
  };
}

export default class DocumentSidebarResourceListComponent extends Component<DocumentSidebarResourceListComponentSignature> {
  get listIsEmpty() {
    return Object.keys(this.args.items).length === 0;
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

    for (let sprite of insertedSprites) {
      sprite.applyStyles({
        opacity: "0",
      });
      yield wait(100);
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
    "Document::Sidebar::ResourceList": typeof DocumentSidebarResourceListComponent;
  }
}
