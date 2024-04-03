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
import { announce } from "@atlaskit/pragmatic-drag-and-drop-live-region";
import { guidFor } from "@ember/object/internals";
import { schedule } from "@ember/runloop";

enum Edges {
  Top = "top",
  Bottom = "bottom",
}

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
      },
    ];
  };
}

export default class ProjectResourceListItemComponent extends Component<ProjectResourceListItemComponentSignature> {
  /**
   * A unique identifier used for the `customNativeDragPreview` container.
   * Used by `in-element` to render the drag preview in the correct location.
   */
  protected id = guidFor(this);

  /**
   * Whether the item is currently being dragged.
   * Set true `onGenerateDragPreview` and false `onDrop`.
   * Used to conditionally render the drag preview.
   */
  @tracked protected isDragging = false;

  /**
   * Whether the item is currently being dragged over.
   * Set true `onDragEnter` and false `onDragLeave`.
   * Used to conditionally render the drop indicator.
   */
  @tracked protected dragHasEntered = false;

  /**
   * The closest edge of the drop target element.
   * Used to determine where the drop indicator should be rendered.
   */
  @tracked protected closestEdge: Edge | null = null;

  /**
   * The list item element. Registered on render and used in drag-and-drop
   * functions and scoped `querySelector` calls.
   */
  @tracked protected el: HTMLElement | null = null;

  /**
   * The drag handle element. Targeted for focus after a drop.
   */
  @tracked protected _dragHandle: HTMLButtonElement | null = null;

  /**
   * The title of the item, whether it's a document or a resource.
   * Used in the `customNativeDragPreview`.
   */
  protected get itemTitle() {
    if ("title" in this.args.item) {
      return this.args.item.title;
    } else {
      return this.args.item.name;
    }
  }

  /**
   * The document number of the item, if it's a document.
   * Used in the `customNativeDragPreview`.
   */
  protected get docNumber() {
    if ("documentNumber" in this.args.item) {
      return this.args.item.documentNumber;
    } else {
      return null;
    }
  }

  /**
   * An asserted-true getter for the drag handle element.
   */
  protected get dragHandle() {
    assert("dragHandle must exist", this._dragHandle);
    return this._dragHandle;
  }

  /**
   * The action to announce the movement of an item to screen readers.
   * Called when an item is moved up, down, to the top, or to the bottom.
   */
  private announceMovement(direction: string) {
    announce(`${this.itemTitle} moved ${direction}`);
  }

  private scheduleFocusDragHandle() {
    schedule("afterRender", () => {
      this.dragHandle.focus();
    });
  }

  /**
   * The action to register the list item.
   * Called on render and used as a target for drag-and-drop functions.
   */
  @action protected registerElement(element: HTMLElement) {
    this.el = element;
  }

  /**
   * The action to move an item to the top of the list.
   * Called on click of the "move to top" button.
   */
  @action protected moveToTop() {
    this.args.onSave(this.args.index, 0);
    this.announceMovement("to top");
    this.scheduleFocusDragHandle();
  }

  /**
   * The action to move an item up in the list.
   * Called on click of the "move up" button.
   */
  @action protected moveUp() {
    this.args.onSave(this.args.index, this.args.index - 1);
    this.announceMovement("up");
    this.scheduleFocusDragHandle();
  }

  /**
   * The action to move an item down in the list.
   * Called on click of the "move down" button.
   */
  @action protected moveDown() {
    this.args.onSave(this.args.index, this.args.index + 1);
    this.announceMovement("down");
    this.scheduleFocusDragHandle();
  }

  /**
   * The action to move an item to the bottom of the list.
   * Called on click of the "move to bottom" button.
   */
  @action protected moveToBottom() {
    this.args.onSave(this.args.index, this.args.itemCount - 1);
    this.announceMovement("to bottom");
    this.scheduleFocusDragHandle();
  }

  private isHoveringSameParent(e: ElementDropTargetEventBasePayload) {
    const sourceElement = e.source.element;
    const selfElement = e.self.element;

    const sourceElementParent = sourceElement.parentElement;
    const selfElementParent = selfElement.parentElement;

    return sourceElementParent === selfElementParent;
  }

  /**
   * The action to configure the drag-and-drop functionality.
   * Called on render if the list is interactive. Configures the drag-and-drop
   * functionality for the list item.
   */
  @action protected configureDragAndDrop() {
    assert("element must exist", this.el);

    const element = this.el;
    this._dragHandle = this.el.querySelector(`.drag-handle`);

    combine(
      draggable({
        element,
        dragHandle: this.dragHandle,
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

          schedule("afterRender", () => {
            this.dragHandle.focus();
          });
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
              allowedEdges: [Edges.Top, Edges.Bottom],
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
              (isItemBeforeSource && closestEdge === Edges.Bottom) ||
              (isItemAfterSource && closestEdge === Edges.Top);

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
          const isHoveringSelf = e.source.element === element;

          if (!isHoveringSelf && this.isHoveringSameParent(e)) {
            this.dragHasEntered = true;
          }
        },
        onDragLeave: () => {
          this.dragHasEntered = false;
          this.closestEdge = null;
        },
        onDrop: (e: ElementDropTargetEventBasePayload) => {
          if (!this.isHoveringSameParent(e)) {
            return;
          }

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

          // Announce to screen readers
          announce(
            `${this.itemTitle} moved from position ${index + 1} to ${
              newIndex + 1
            }`,
          );

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
