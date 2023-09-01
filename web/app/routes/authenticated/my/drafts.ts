import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import { task } from "ember-concurrency";
import AlgoliaService, { AlgoliaSearchParams } from "hermes/services/algolia";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import FetchService from "hermes/services/fetch";
import { DraftResponseJSON } from "../my";
import { SortByValue } from "hermes/components/header/toolbar";
import { assert } from "@ember/debug";

interface MyDraftsRouteParams {
  sortBy?: SortByValue;
  page?: number;
}

export default class AuthenticatedMyDraftsRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;
  @service declare algolia: AlgoliaService;
  @service declare authenticatedUser: AuthenticatedUserService;

  queryParams = {
    page: {
      refreshModel: true,
    },
    sortBy: {
      refreshModel: true,
    },
  };

  private createDraftURLSearchParams(
    params: MyDraftsRouteParams
  ): URLSearchParams {
    return new URLSearchParams(
      Object.entries({
        hitsPerPage: 12,
        maxValuesPerFacet: 1,
        page: params.page ? params.page - 1 : 0,
        sortBy: params["sortBy"],
        ownerEmail: this.authenticatedUser.info.email,
      })
        .map(([key, val]) => `${key}=${val}`)
        .join("&")
    );
  }

  /**
   * Fetches draft doc information based on searchParams and the current user.
   */
  private getDraftResults = task(
    async (
      params: MyDraftsRouteParams
    ): Promise<DraftResponseJSON | undefined> => {
      try {
        let response = await this.fetchSvc
          .fetch("/api/v1/drafts?" + this.createDraftURLSearchParams(params))
          .then((response) => response?.json());
        return response;
      } catch (e: unknown) {
        console.error(e);
      }
    }
  );

  async model(params: MyDraftsRouteParams) {
    const sortedBy = params.sortBy ?? SortByValue.DateDesc;
    const results = await this.getDraftResults.perform(params);

    assert("results must exist", results);

    return { results, sortedBy };
  }
}
