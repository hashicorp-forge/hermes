import { action } from "@ember/object";
import Component from "@glimmer/component";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  dropTargetForElements,
  monitorForElements,
  ElementEventBasePayload,
  ElementDropTargetEventBasePayload,
  ElementDropTargetGetFeedbackArgs,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  attachClosestEdge,
  Edge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { assert } from "@ember/debug";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { tracked } from "@glimmer/tracking";
import { RelatedResource } from "../related-resources";

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
  Args: {
    item: RelatedResource;
    index: number;
  };
  Blocks: {
    default: [];
  };
}

export default class ProjectResourceListItemComponent extends Component<ProjectResourceListItemComponentSignature> {
  @tracked protected isDragging = false;

  @tracked protected dragHasEntered = false;

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
        getInitialData: () => {
          return {
            index: this.args.index,
          };
        },
        onDrag: (e: ElementEventBasePayload) => {
          const sourceIndex = e.source.data["index"];

          assert(
            "sourceIndex must be a number",
            typeof sourceIndex === "number",
          );

          const dropTargetIndex = e.location.current.dropTargets[0]?.data;
          console.log("sourceIndex", sourceIndex);
          console.log("dropTargetIndex", dropTargetIndex);
        },
      }),

      dropTargetForElements({
        element,
        getData(e: ElementDropTargetGetFeedbackArgs) {
          return attachClosestEdge(e.source.data, {
            element,
            input: e.input,
            allowedEdges: ["top", "bottom"],
          });
        },
        canDrop: (e: ElementDropTargetGetFeedbackArgs) => {
          return e.source.element !== element;
        },
        onDrag: (e: ElementDropTargetEventBasePayload) => {
          const isSource = e.source.element === element;
          if (isSource) {
            this.closestEdge = null;
            return;
          }

          const closestEdge = extractClosestEdge(e.self.data);

          // TODO: this has logic to not show
          // the indicator when dropping the item
          // would not change the order of the list

          const sourceIndex = e.source.data["index"];

          assert(
            "sourceIndex must be a number",
            typeof sourceIndex === "number",
          );

          const dropTargetIndex = e.location.current.dropTargets[0]?.data;
          console.log("sourceIndex", sourceIndex);
          console.log("dropTargetIndex", dropTargetIndex);

          // const isItemBeforeSource = index === sourceIndex - 1;
          // const isItemAfterSource = index === sourceIndex + 1;

          // const isDropIndicatorHidden =
          //   (isItemBeforeSource && closestEdge === "bottom") ||
          //   (isItemAfterSource && closestEdge === "top");

          // if (isDropIndicatorHidden) {
          //   setClosestEdge(null);
          //   return;
          // }

          this.closestEdge = closestEdge;
        },
        onDragEnter: (e: ElementDropTargetEventBasePayload) => {
          if (e.source.element !== element) {
            this.dragHasEntered = true;
          }
        },
        onDragLeave: () => {
          this.dragHasEntered = false;
          this.closestEdge = null;
        },
        onDrop: (e: ElementDropTargetEventBasePayload) => {
          const { data } = e.source;
          const index = data["index"];
          assert("index must be a number", typeof index === "number");
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
