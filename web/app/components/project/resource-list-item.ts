import { action } from "@ember/object";
import Component from "@glimmer/component";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  dropTargetForElements,
  monitorForElements,
  ElementEventBasePayload,
  ElementDropTargetEventBasePayload,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  attachClosestEdge,
  Edge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { assert } from "@ember/debug";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { tracked } from "@glimmer/tracking";
type Item = {
  id: string;
  label: string;
};

const itemKey = Symbol("item");

type ItemData = {
  [itemKey]: true;
  item: Item;
  index: number;
  instanceId: symbol;
};

function getItemData({
  item,
  index,
  instanceId,
}: {
  item: Item;
  index: number;
  instanceId: symbol;
}): ItemData {
  return {
    [itemKey]: true,
    item,
    index,
    instanceId,
  };
}

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

  @tracked protected dragHasEnteredBottom = false;
  @tracked protected dragHasEnteredTop = false;

  @tracked protected clientY = 0;

  @tracked protected currentMiddle = 0;

  @tracked protected closestEdge: Edge | null = null;

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
          this.clientY = e.location.current.input.clientY;
        },
      }),
      // monitorForElements({
      //   onDrag: (e: ElementEventBasePayload) => {
      //     debugger;
      //   },
      // }),
      dropTargetForElements({
        element,
        getData({ input }) {
          // FIXME
          return attachClosestEdge(
            {},
            {
              element,
              input,
              allowedEdges: ["top", "bottom"],
            },
          );
        },
        canDrop: (e) => {
          return e.source.element !== element;
        },
        onDrag: ({ self, source }) => {
          const isSource = source.element === element;
          if (isSource) {
            this.closestEdge = null;
            return;
          }

          const closestEdge = extractClosestEdge(self.data);

          // const sourceIndex = source.data.index;
          // invariant(typeof sourceIndex === 'number');

          // const isItemBeforeSource = index === sourceIndex - 1;
          // const isItemAfterSource = index === sourceIndex + 1;

          // const isDropIndicatorHidden =
          //   (isItemBeforeSource && closestEdge === 'bottom') ||
          //   (isItemAfterSource && closestEdge === 'top');

          // if (isDropIndicatorHidden) {
          //   setClosestEdge(null);
          //   return;
          // }

          this.closestEdge = closestEdge;
        },
        onDragEnter: (e: ElementDropTargetEventBasePayload) => {
          console.log("ON DRAG ENEENE");
          if (e.source.element !== element) {
            console.log("setting dragHasEntered to true");
            this.dragHasEntered = true;

            const rect = element.getBoundingClientRect();
            const top = rect.top;
            const bottom = rect.bottom;

            const middle = top + (bottom - top) / 2;

            this.currentMiddle = middle;
          }
        },
        onDragLeave: () => {
          this.dragHasEntered = false;
          this.closestEdge = null;
        },
        onDrop: (e: ElementDropTargetEventBasePayload) => {
          this.dragHasEntered = false;
          this.closestEdge = null;
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
