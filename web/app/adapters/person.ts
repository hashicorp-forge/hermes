import JSONAdapter from "@ember-data/adapter/json-api";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import SessionService from "hermes/services/session";
import ApplicationAdapter from "./application";
import RSVP from "rsvp";

export default class PersonAdapter extends ApplicationAdapter {
  findRecord(store: any, type: any, id: any, snapshot: any) {
    const record = store.query("person", {
      emails: id,
    });

    console.log("record", record);

    return new RSVP.Promise((resolve, reject) => {
      record.then((data: any) => {
        resolve(data);
      });

      record.catch((error: any) => {
        reject(error);
      });
    });

    //  need the findRecord to look like people/emails?jeff@hashicorp.com
    // currently looks like people/jeff@hashicorp.com

    return super.findRecord(store, type, id, snapshot);
  }
}

/**
 * // GET to /users?filter[email]=tomster@example.com
tom = store.query('user', {
  filter: {
    email: 'tomster@example.com'
  }
}).then(function(users) {
  return users[0]; // the first object
});
 */
