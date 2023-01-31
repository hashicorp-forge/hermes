import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";

export default class customEditableFields extends Component {
  get typeIsString() {
    return this.args.attributes.type === "STRING";
  }

  get typeIsPeople() {
    return this.args.attributes.type === "PEOPLE";
  }

  @tracked emails = this.args.attributes.value || [];

  @action updateEmails(people) {
    this.emails = people.map((person) => person.email);

  }

  get people() {
    return this.emails.map((email) => ({ email, imgURL: null }));
  }
}
