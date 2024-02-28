import FlashMessageService, {
  FlashFunction,
  MessageOptions,
} from "ember-cli-flash/services/flash-messages";

export default class HermesFlashMessagesService extends FlashMessageService {
  critical: FlashFunction;
  success: FlashFunction;
}
