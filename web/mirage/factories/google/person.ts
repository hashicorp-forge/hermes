import { Factory } from "miragejs";
import { assert } from "@ember/debug";
import { TEST_USER_PHOTO } from "hermes/utils/mirage-utils";

export default Factory.extend({
  names: (i: number) => [{ displayName: `User ${i + 1}`, givenName: `User` }],
  emailAddresses: (i: number) => [{ value: `user${i + 1}@hashicorp.com` }],
  photos: (i: number) => [{ url: TEST_USER_PHOTO }],

  // @ts-ignore - Bug https://github.com/miragejs/miragejs/issues/1052
  afterCreate(googlePerson: any, server: any): void {
    // Also create a `person` record for the user.

    const { emailAddresses, names, photos } = googlePerson.attrs;

    const email = emailAddresses?.[0]?.value;
    const firstName = names?.[0]?.givenName;
    const name = names?.[0]?.displayName;
    const picture = photos?.[0]?.url;

    server.create("person", {
      id: email,
      email,
      name,
      firstName,
      picture,
    });
  },
});
