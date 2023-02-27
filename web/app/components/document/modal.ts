import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";

interface DocumentModalComponentSignature {
  Args: {
    color?: string;
    errorIsShown: boolean;
    errorTitle: string;
    taskButtonText: string;
    taskButtonLoadingText: string;
    taskButtonIcon?: string;
    taskButtonIsDisabled?: boolean;
    dismissError: () => void;
    close: () => void;
    task: () => Promise<void>;
  };
}

export default class DocumentModalsArchiveComponent extends Component<DocumentModalComponentSignature> {
  @tracked taskIsRunning = false;

  @tracked protected errorIsShown = false;
  @tracked protected errorTitle = "";
  @tracked protected errorDescription = "";

  private showModalError(title: string, description: unknown | string) {
    this.errorIsShown = true;
    this.errorTitle = title;
    this.errorDescription = description as string;
  }

  @action protected resetModalErrors() {
    this.errorIsShown = false;
    this.errorTitle = "";
    this.errorDescription = "";
  }

  protected task = task(async () => {
    try {
      this.taskIsRunning = true;
      await this.args.task();
      this.args.close();
    } catch (error: unknown) {
      this.taskIsRunning = false;
      this.showModalError(this.args.errorTitle, error);
    }
  });
}
