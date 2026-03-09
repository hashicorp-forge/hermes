import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import type RouterService from '@ember/routing/router-service';
import type ConfigService from 'hermes/services/config';
import type HermesFlashMessagesService from 'hermes/services/flash-messages';
import { FLASH_MESSAGES_LONG_TIMEOUT } from 'hermes/utils/ember-cli-flash/timeouts';

interface RedirectModel { 
  fallback?: boolean; 
  document_id: string;
  redirectUrl?: string;
}

export default class AuthenticatedDocumentRoute extends Route {
  @service('config') configSvc!: ConfigService;
  @service router!: RouterService;
  @service declare flashMessages: HermesFlashMessagesService;

  async model(params: { document_id: string }, transition: any): Promise<RedirectModel | void> {
    const isDraft = !!transition.to?.queryParams?.draft;
    const base = isDraft ? 'drafts' : 'documents';
    const docId = params.document_id;
    const endpoint = `/api/${this.configSvc.config.api_version}/${base}/${docId}`;

    try {
      const resp = await fetch(endpoint, { 
        method: 'HEAD', 
        redirect: 'manual',
        headers: { 'Add-To-Recently-Viewed': 'true' }
      });
      if (resp.status === 404) {
        this.flashMessages.critical('Document not found', {
          title: 'Error accessing document',
          timeout: FLASH_MESSAGES_LONG_TIMEOUT,
        });
        transition.abort();
        return;
      } else if (resp.ok) {
        const loc = resp.headers.get('X-Direct-Edit-URL');
        if (loc) {
          // Return a special model to trigger the redirect template
          // The actual redirect will happen in afterModel
          return { document_id: docId, redirectUrl: loc };
        }
        // No header available - show message and abort
        this.flashMessages.warning('External editing not available for this document', {
          title: 'External edit unavailable',
          timeout: FLASH_MESSAGES_LONG_TIMEOUT,
        });
        transition.abort();
        return;
      } else {
        // Other HTTP error (403, 500, etc)
        this.flashMessages.critical(`Unable to access document (${resp.status})`, {
          title: 'Error accessing document',
          timeout: FLASH_MESSAGES_LONG_TIMEOUT,
        });
        transition.abort();
        return;
      }
    } catch (e) {
      // Network error, CORS, etc
      this.flashMessages.critical('Failed to access document', {
        title: 'Connection error',
        timeout: FLASH_MESSAGES_LONG_TIMEOUT,
      });
      transition.abort();
      return;
    }
  }

  afterModel(model: RedirectModel | void, transition: any) {
    // If we have a redirect URL, perform the redirect after a brief delay
    // to allow the user to see the loading screen
    if (model && model.redirectUrl) {
      setTimeout(() => {
        window.location.replace(model.redirectUrl!);
      }, 500); // 500ms delay to show the "Opening document..." message
    }
  }
}
