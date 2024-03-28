import { action } from "@ember/object";
import Component from "@glimmer/component";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  dropTargetForElements,
  monitorForElements,
  ElementEventBasePayload,
  ElementDropTargetEventBasePayload,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { assert } from "@ember/debug";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { tracked } from "@glimmer/tracking";

interface ProjectResourceListItemComponentSignature {
  Element: HTMLLIElement;
  Args: {};
  Blocks: {
    default: [];
  };
}

export default class ProjectResourceListItemComponent extends Component<ProjectResourceListItemComponentSignature> {
  @tracked protected isDragging = false;
  @tracked protected dragHasEntered = false;

  @action protected configureDragAndDrop(element: HTMLElement) {
    const dragHandle = element.querySelector(".drag-handle");
    assert("dragHandle must exist", dragHandle);

    combine(
      draggable({
        element,
        dragHandle,
        onDragStart: () => {
          this.isDragging = true;
        },
        onDrop: () => {
          this.isDragging = false;
        },
        getInitialData: (e) => {
          return {
            someData: true,
            // return some data that we can use to reorder later?
          };
        },
        onDrag: (e: ElementEventBasePayload) => {
          const { location } = e;
          const { current } = location;
          const { dropTargets, input } = current;

          console.log("dropTargets", dropTargets);
          console.log("input", input);

          // need to capture the position values
        },
      }),
      // monitorForElements({
      //   onDrag: (e: ElementEventBasePayload) => {
      //     debugger;
      //   },
      // }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) => {
          console.log("canDrop?", source.element !== element);
          return source.element !== element;
          // return this.dragHasEntered;
        },
        onDragEnter: (e: ElementDropTargetEventBasePayload) => {
          if (e.source.element !== element) {
            this.dragHasEntered = true;
          }
        },
        onDragLeave: () => {
          this.dragHasEntered = false;
        },
        onDrop: (e: ElementDropTargetEventBasePayload) => {
          // TODO
          this.dragHasEntered = false;
        },
      }),
    );
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::ResourceListItem": typeof ProjectResourceListItemComponent;
  }
}
