import Component from "@glimmer/component";
import { task } from "ember-concurrency";
import { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import Ember from "ember";
import cleanString from "hermes/utils/clean-string";

const FORM_ERRORS = {
  title: null,
  summary: null,
  productAbbreviation: null,
  tags: null,
  contributors: null,
};

const AWAIT_DOC_DELAY = Ember.testing ? 0 : 2000;
const AWAIT_DOC_CREATED_MODAL_DELAY = Ember.testing ? 0 : 1500;

export default class NewDocForm extends Component {
  @service("fetch") fetchSvc;
  @service authenticatedUser;
  @service flashMessages;
  @service modalAlerts;
  @service router;

  @tracked title = "";
  @tracked summary = "";
  @tracked productArea = "";
  @tracked tags = [];
  @tracked contributors = [];

  get productAbbreviation() {
    return this.args.productAbbrevMappings.get(this.productArea);
  }

  get form() {
    return {
      title: this.title,
      summary: this.summary,
      productArea: this.productArea,
      productAbbreviation: this.productAbbreviation,
      tags: this.tags,
      contributors: this.contributors,
    };
  }

  @tracked docType = null;
  @tracked isValid = false;
  @tracked docIsBeingCreated = false;
  @tracked people = [];
  @tracked formErrors = { ...FORM_ERRORS };

  // Don't do that annoying thing where fields become red before the user even gets a chance to submit the form.
  @tracked eagerValidation = false;

  get hasErrors() {
    const defined = (a) => a != null;
    return Object.values(this.formErrors).filter(defined).length > 0;
  }

  @action updateForm(ev) {
    const formObject = Object.fromEntries(
      new FormData(ev.target.form).entries()
    );

    this.title = formObject.title;
    this.summary = formObject.summary;
    this.productArea = formObject.productArea;

    // Check for required fields.
    this.isValid = this.title && this.productArea;

    // Validate other fields.
    if (this.eagerValidation) {
      this.validate();
    }
  }

  @action updateTags(tags) {
    this.tags = tags;

    if (this.eagerValidation) {
      this.validate();
    }
  }

  @action
  updateContributors(contributors) {
    this.contributors = contributors;
  }

  @action submit(ev) {
    ev.preventDefault();

    // Now that a submission has been attempted, we can be aggressive about validation
    this.eagerValidation = true;
    this.validate();
    if (this.isValid && !this.hasErrors) {
      this.createDoc.perform(this.form);
    }
  }

  validate() {
    const errors = { ...FORM_ERRORS };
    if (/\d/.test(this.productAbbreviation)) {
      errors.productAbbreviation =
        "Product abbreviation can't include a number";
    }

    if (this.tags.length > 5) {
      errors.tags = "A maximum of 5 tags are allowed.";
    }

    this.formErrors = errors;
  }

  // getEmails extracts the emails
  // from the select options object
  getEmails(values) {
    const emails = [];
    values.forEach(function (v) {
      if (v) {
        emails.push(v.email);
      }
    });

    return emails;
  }

  @task *createDoc() {
    this.docIsBeingCreated = true;

    // Returns a promise that always results after the provided number of milliseconds
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));

    try {
      const doc = yield this.fetchSvc
        .fetch("/api/v1/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contributors: this.getEmails(this.contributors),
            docType: this.args.docType,
            owner: this.authenticatedUser.info.email,
            product: this.productArea,
            productAbbreviation: this.productAbbreviation,
            summary: cleanString(this.summary),
            title: cleanString(this.title),
            tags: this.tags,
          }),
        })
        .then((resp) => resp.json())
        .catch((err) => {
          this.docIsBeingCreated = false;
          console.log(`Error creating document draft: ${err}`);
          throw err;
        });

      // Wait for document to be available.
      yield wait(AWAIT_DOC_DELAY);

      // Set modal on a delay so it appears after transition.
      this.modalAlerts.setActive.perform(
        "docCreated",
        AWAIT_DOC_CREATED_MODAL_DELAY
      );

      this.router.transitionTo("authenticated.document", doc.id, {
        queryParams: { draft: true },
      });
    } catch (err) {
      this.docIsBeingCreated = false;
      // TODO: Handle error by using a toast and showing the create form again with
      // everything still populated
      throw err;
    }
  }

  @task
  *searchDirectory(query) {
    const peopleResp = yield this.fetchSvc
      .fetch("/api/v1/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query,
        }),
      })
      .then((resp) => resp.json())
      .catch((err) => {
        console.log(`Error querying people: ${err}`);
        throw err;
      });

    const peopleData = [];
    peopleResp.forEach(function (p) {
      // Only set image URL for
      // users that have it set
      if (p.photos) {
        peopleData.push({
          email: p.emailAddresses[0].value,
          imgURL: p.photos[0].url,
        });
      } else {
        peopleData.push({ email: p.emailAddresses[0].value });
      }
    });

    this.people = peopleData;
  }
}
