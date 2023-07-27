import Route from '@ember/routing/route';
import { inject as service } from "@ember/service";

export default class AuthenticatedBusinessUnitsRoute extends Route {
  @service("fetch") fetchSvc;
    async model() {
        try {
            let products = await this.fetchSvc
              .fetch("/api/v1/products")
              .then((resp) => resp?.json());
            this.products = products;
          } catch (err) {
            console.error(err);
            throw err;
          }


        return this.products;
      }
}