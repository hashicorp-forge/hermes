import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import { action } from "@ember/object";
import { task } from "ember-concurrency";

export default class DocumentIndexComponent extends Component {
  @service authenticatedUser;
  @service("fetch") fetchSvc;
  @service router;
  @service flashMessages;

  @task *deleteDraft(docID) {
    // Returns a promise that always results after the provided number of milliseconds
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));

    try {
      const docResp = yield this.fetchSvc
        .fetch("/api/v1/drafts/" + docID, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        })
        .then((resp) => resp.json())
        .catch((err) => {
          console.log(`Error deleting document draft: ${err}`);
          throw err;
        });

      // Wait for document to be deleted.
      yield wait(2000);

      // Add a notification for the user
      this.flashMessages.add({
        message: "Document draft deleted",
        title: "Done!",
        type: "success",
        timeout: 6000,
        extendedTimeout: 1000,
      });

      // Transition to my drafts view
      this.router.transitionTo("authenticated.drafts");
    } catch (err) {
      // TODO: Handle error by using a toast and showing the create form again with
      // everything still populated
      throw err;
    }
  }
}
