import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";

interface DocumentModalComponentSignature {
  Args: {
    color?: string;
    headerText: string;
    bodyText?: string;
    errorTitle: string;
    taskButtonText: string;
    taskButtonLoadingText: string;
    taskButtonIcon?: string;
    taskButtonIsDisabled?: boolean;
    hideFooterWhileSaving?: boolean;
    close: () => void;
    task: () => Promise<void>;
  };
  Blocks: {
    default: [taskIsRunning: boolean];
  };
}

export default class DocumentModalComponent extends Component<DocumentModalComponentSignature> {
  @tracked taskIsRunning = false;

  @tracked protected errorIsShown = false;
  @tracked protected errorTitle = "";
  @tracked protected errorDescription = "";

  private showError(title: string, description: unknown | string) {
    this.errorIsShown = true;
    this.errorTitle = title;
    this.errorDescription = description as string;
  }

  @action protected resetErrors() {
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
      this.showError(this.args.errorTitle, error);
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Modal": typeof DocumentModalComponent;
  }
}
