import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";

interface DocumentModalsArchiveComponentSignature {
  Element: null;
  Args: {
    errorIsShown: boolean;
    errorTitle: string;
    errorDescription: string;
    dismissError: () => void;
    close: () => void;
    archiveTask: () => Promise<void>;
  };
}

export default class DocumentModalsArchiveComponent extends Component<DocumentModalsArchiveComponentSignature> {
  @tracked isArchiving = false;

  protected archiveDocument = task(async () => {
    this.isArchiving = true;
    await this.args.archiveTask();
    this.isArchiving = false;
  });
}
