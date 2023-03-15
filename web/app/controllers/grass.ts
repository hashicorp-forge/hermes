import { A } from "@ember/array";
import NativeArray from "@ember/array/-private/native-array";
import Controller from "@ember/controller";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { restartableTask } from "ember-concurrency";

export default class GrassController extends Controller {
  @tracked relatedResources = A();

  @tracked inputValue = "";

  @tracked inputValueIsValid = false;

  get searchButtonIsShown() {
    return this.inputValue.length === 0;
  }

  checkURL = restartableTask(async () => {
    const url = this.inputValue;
    try {
      this.inputValueIsValid = Boolean(new URL(url));
    } catch (e) {
      this.inputValueIsValid = false;
    }
  });

  @action addResource() {
    this.relatedResources.pushObject(this.inputValue);
    this.clearSearch();
  }

  @action noop() {
    return;
  }

  @action onKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      if (this.inputValueIsValid) {
        this.addResource();
      }
    }
  }

  @action onInput(event: Event) {
    this.inputValue = (event.target as HTMLInputElement).value;
    this.checkURL.perform();
  }

  @action clearSearch() {
    this.inputValue = "";
  }
}
