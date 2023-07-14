import Controller from "@ember/controller";
import { alias } from "@ember/object/computed";
import { inject as service } from "@ember/service";
import {tracked} from "@glimmer/tracking";
import {action} from "@ember/object";
import {task, timeout} from "ember-concurrency";
import Ember from "ember";
import {TaskForAsyncTaskFunction} from "ember-concurrency";
import FetchService from "../../services/fetch";

const AWAIT_DOC_DELAY = Ember.testing ? 0 : 1000;

export default class AuthenticatedDashboardController extends Controller {
  @alias("model.docsWaitingForReview") docsWaitingForReview;

  @service router;
  @service authenticatedUser;
  @service("config") configSvc;
  @service("recently-viewed-docs") recentDocs;
  @service('flash-messages') flashMessages;
  @service("fetch") fetchSvc: FetchService;

  queryParams = ["latestUpdates"];
  latestUpdates = "newDocs";
  @tracked showModal1 = false;
  @tracked showModal2 = false;

  @tracked businessUnitName: string = '';
  @tracked bu_abbreviation: string = '';
  @tracked BUIsBeingCreated = false;

  @tracked TeamName: string = "";
  @tracked TeamAbbreviation: string = "";
  @tracked TeamIsBeingCreated = false;
  @tracked TeamBU: string | null = null;


  @action
  toggleModal1() {
    this.toggleProperty('showModal1');
  }

  @action
  toggleModal2() {
    this.toggleProperty('showModal2');
  }

  @action
  updateSelectedBU(selectedBU) {
    // Trigger the necessary actions, such as fetching filtered teams
    // ...
  }


  @action onProductSelect(
    productName,
  ) {
    this.TeamBU = productName;
  }

  /**
   * Creates a Team, then redirects to the dashboard.
   * On error, show a flashMessage and allow users to try again.
   */
  private createTeam: TaskForAsyncTaskFunction<unknown, () => Promise<void>> = task(async () => {
    this.TeamIsBeingCreated = true;
    try {
      const bu = await this.fetchSvc
          .fetch("/api/v1/teams", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
              teamName: this.TeamName,
              teamAbbreviation: this.TeamAbbreviation,
              teamBU: this.TeamBU,
            }),
          })
          .then((response) => response?.json());

      // Wait for document to be available.
      await timeout(AWAIT_DOC_DELAY);

      this.router.transitionTo("authenticated.dashboard");
      this.toggleModal2();
      this.flashMessages.add({
        title: "Success",
        message: `New Team has been created Succesfully`,
        type: "success",
        timeout: 6000,
        extendedTimeout: 1000,
      });
    } catch (err) {
      this.docIsBeingCreated = false;
      this.flashMessages.add({
        title: "Error creating new Team",
        message: `${err}`,
        type: "critical",
        timeout: 6000,
        extendedTimeout: 1000,
      });
    } finally {
      // Hide spinning wheel or loading state
      this.set('TeamIsBeingCreated', false);
    }
  });

  @action submitFormteam(event: SubmitEvent) {
    // Show spinning wheel or loading state
    this.set('TeamIsBeingCreated', true);
    event.preventDefault();

    const formElement = event.target;
    const formData = new FormData(formElement);
    const formObject = Object.fromEntries(formData.entries());

    // Do something with the formObject
    console.log(formObject);

    // Do something with the form values
    this.TeamName = formObject['team-name'];
    this.TeamAbbreviation = formObject['team-abbr'];
    // this.TeamBU = formObject['bu-name'];

    // now post this info
    this.createTeam.perform();

    // Clear the form fields
    this.TeamName = "";
    this.TeamAbbreviation = "";
    this.TeamBU = "";
  }

  /**
   * Creates a BU, then redirects to the dashboard.
   * On error, show a flashMessage and allow users to try again.
   */
  private createBU:  TaskForAsyncTaskFunction<unknown, () => Promise<void>> = task(async () => {
    this.BUIsBeingCreated = true;
    try {
      const bu = await this.fetchSvc
          .fetch("/api/v1/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productName: this.businessUnitName,
              productAbbreviation: this.bu_abbreviation,
            }),
          })
          .then((response) => response?.json());

      // Wait for document to be available.
      await timeout(AWAIT_DOC_DELAY);

      this.router.transitionTo("authenticated.dashboard");
      this.toggleModal1();
      this.flashMessages.add({
        title: "Success",
        message: `New Business Unit (BU) created succesfully`,
        type: "success",
        timeout: 6000,
        extendedTimeout: 1000,
      });
    } catch (err) {
      this.flashMessages.add({
        title: "Error creating new Business Unit",
        message: `${err}`,
        type: "critical",
        timeout: 6000,
        extendedTimeout: 1000,
      }); }
    finally {
      // Hide spinning wheel or loading state
      this.set('BUIsBeingCreated', false);
    }
  });

  @action  submitFormBU(event: SubmitEvent) {
    // Show spinning wheel or loading state
    this.set('BUIsBeingCreated', true);
    event.preventDefault();

    const formElement = event.target;
    const formData = new FormData(formElement);
    const formObject = Object.fromEntries(formData.entries());

    // Do something with the formObject
    console.log(formObject);

    // Do something with the form values
    this.businessUnitName = formObject['bu-name'];
    this.bu_abbreviation = formObject['bu-abbr'];

    // now post this info
    this.createBU.perform();

    // Clear the form fields
    this.businessUnitName = "";
    this.bu_abbreviation = "";
  }
}