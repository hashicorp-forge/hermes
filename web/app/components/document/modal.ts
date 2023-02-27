import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";

interface DocumentModalComponentSignature {
  Args: {
    color?: string;
    errorIsShown: boolean;
    errorTitle: string;
    errorDescription: string;
    taskButtonText: string;
    taskButtonLoadingText: string;
    taskButtonIcon?: string;
    taskButtonIsDisabled?: boolean;
    dismissError: () => void;
    close: () => void;
    task: () => Promise<void>;
  };
  Blocks: {
    default: [
      {
        taskIsRunning: boolean;
      }
    ];
  };
}

export default class DocumentModalsArchiveComponent extends Component<DocumentModalComponentSignature> {
  @tracked taskIsRunning = false;

  protected task = task(async () => {
    try {
      this.taskIsRunning = true;
      await this.args.task();
    } catch {
      this.taskIsRunning = false;
    }
  });
}
