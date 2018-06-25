import { RTMClient } from "@slack/client";
import SlackManager from "./manager";
import { SlackMessage, UiMessage, SlackChannel } from "./interfaces";

class SlackMessenger {
  messages: SlackMessage[];
  manager: SlackManager;
  channel: SlackChannel;
  rtmClient: RTMClient;
  uiCallback: (message: UiMessage) => void;

  constructor(public token: string) {
    this.manager = new SlackManager(token);
    this.messages = [];
  }

  init() {
    return this.manager.init();
  }

  setCurrentChannel(channel: SlackChannel) {
    if (this.rtmClient && this.rtmClient.connected) {
      this.rtmClient.disconnect();
      this.rtmClient = null;
    }

    this.rtmClient = new RTMClient(this.token);
    this.channel = channel;
    this.rtmClient.start();

    this.rtmClient.on("message", event => {
      if (this.channel.id === event.channel) {
        const msg = this.getMessageFromEvent(event);
        this.messages.push(msg);
        this.updateUi();
      }
    });

    this.loadHistory();
  }

  setUiCallback(uiCallback) {
    this.uiCallback = uiCallback;
  }

  updateUi() {
    this.uiCallback({
      messages: this.messages,
      users: this.manager.users,
      channel: this.channel
    });
  }

  loadHistory() {
    this.manager
      .getConversationHistory(this.channel.id)
      .then(messages => {
        this.messages = messages;
        this.updateUi();
      })
      .catch(error => console.error(error));
  }

  sendMessage(text: string) {
    return this.rtmClient.sendMessage(text, this.channel.id).then(result => {
      this.messages.push({
        userId: this.manager.currentUserId,
        text: text,
        timestamp: result.ts
      });
      this.updateUi();
    });
  }

  getMessageFromEvent(event) {
    return { userId: event.user, text: event.text, timestamp: event.ts };
  }
}

export default SlackMessenger;