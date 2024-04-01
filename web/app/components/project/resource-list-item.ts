import { action } from "@ember/object";
import Component from "@glimmer/component";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  dropTargetForElements,
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
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { guidFor } from "@ember/object/internals";

interface ProjectResourceListItemComponentSignature {
  Element: HTMLLIElement;
  Args: {
    isReadOnly: boolean;
    item: RelatedResource;
    itemCount: number;
    index: number;
    onSave: (currentIndex: number, newIndex: number) => void;
  };
  Blocks: {
    default: [
      {
        moveToTop: () => void;
        moveUp: () => void;
        moveDown: () => void;
        moveToBottom: () => void;
        id: string;
      },
    ];
  };
}

export default class ProjectResourceListItemComponent extends Component<ProjectResourceListItemComponentSignature> {
  id = guidFor(this);

  @tracked protected isDragging = false;

  @tracked protected dragHasEntered = false;

  @tracked protected closestEdge: Edge | null = null;
  @tracked protected el: HTMLElement | null = null;

  protected get canMoveUp() {
    return this.args.index > 0;
  }

  protected get itemTitle() {
    if ("title" in this.args.item) {
      return this.args.item.title;
    } else {
      return this.args.item.name;
    }
  }

  protected get docNumber() {
    if ("documentNumber" in this.args.item) {
      return this.args.item.documentNumber;
    } else {
      return null;
    }
  }

  @action registerElement(element: HTMLElement) {
    this.el = element;
  }

  @action protected moveToTop() {
    this.args.onSave(this.args.index, 0);
  }

  @action protected moveUp() {
    console.log("shouldMoveUp");
    this.args.onSave(this.args.index, this.args.index - 1);
  }

  @action protected moveDown() {
    this.args.onSave(this.args.index, this.args.index + 1);
  }

  @action protected moveToBottom() {
    this.args.onSave(this.args.index, this.args.itemCount - 1);
  }

  @action protected configureDragAndDrop() {
    assert("element must exist", this.el);

    const element = this.el;
    const dragHandle = this.el.querySelector(`#${this.id}-drag-handle`);

    assert("drag handle must exist", dragHandle);

    combine(
      draggable({
        element,
        dragHandle,

        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          this.isDragging = true;
          setCustomNativeDragPreview({
            nativeSetDragImage,
            render: ({ container }) => {
              // Create a target for `in-element`
              container.id = this.id;
            },
          });
        },

        onDrop: () => {
          this.isDragging = false;
        },
        getInitialData: () => {
          return {
            index: this.args.index,
          };
        },
      }),

      dropTargetForElements({
        element,
        getData(e: ElementDropTargetGetFeedbackArgs) {
          return attachClosestEdge(
            {},
            {
              element,
              input: e.input,
              allowedEdges: ["top", "bottom"],
            },
          );
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
          const sourceIndex = e.source.data["index"];

          assert(
            "sourceIndex must be a number",
            typeof sourceIndex === "number",
          );

          const dropTarget = e.location.current.dropTargets[0];

          if (dropTarget) {
            const dataIndex = dropTarget.element.getAttribute("data-index");
            assert("data-index must exist", dataIndex);
            const index = parseInt(dataIndex, 10);
            const isItemBeforeSource = index === sourceIndex - 1;
            const isItemAfterSource = index === sourceIndex + 1;

            const isDropIndicatorHidden =
              (isItemBeforeSource && closestEdge === "bottom") ||
              (isItemAfterSource && closestEdge === "top");

            if (isDropIndicatorHidden) {
              this.closestEdge = null;
              return;
            } else {
              this.closestEdge = closestEdge;
            }
          } else {
            this.closestEdge = null;
            return;
          }
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

          const dropTargetElement = e.location.current.dropTargets[0]?.element;
          let newIndex = parseInt(
            dropTargetElement?.getAttribute("data-index") ?? "",
            10,
          );
          const closestEdge =
            dropTargetElement?.getAttribute("data-closest-edge");

          const isDraggingDown = index < newIndex;
          const isDraggingUp = index > newIndex;

          if (closestEdge === "bottom" && isDraggingUp) {
            newIndex += 1;
          } else if (closestEdge === "top" && isDraggingDown) {
            newIndex -= 1;
          }

          this.args.onSave(index, newIndex);

          this.dragHasEntered = false;
          this.closestEdge = null;

          // TODO: aria announcement
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
