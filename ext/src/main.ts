import { UIManager } from "./content/uiManager";
import { ObserverManager } from "./content/observerManager";
import { MessageManager } from "./content/messageManager";
import { SortManager } from "./content/sortManager";

class LinkedInMessagesManager {
  private uiManager: UIManager;
  private observerManager: ObserverManager;
  private messageManager: MessageManager;
  private sortManager: SortManager;
  private isSorted = false;

  constructor() {
    this.uiManager = new UIManager();
    this.messageManager = new MessageManager();
    this.sortManager = new SortManager();
    this.observerManager = new ObserverManager(() => this.handleUrlOrMessageChange());

    window.addEventListener('load', () => {
      setTimeout(() => {
        this.observerManager.initialize();
        this.messageManager.extractMessages();
        this.uiManager.addUI(() => this.toggleSort());
        this.uiManager.updateConversationCardIndicators();
      }, 2000);
    });
  }

  private handleUrlOrMessageChange(): void {
    // Handle URL changes or new messages detected by ObserverManager
    this.messageManager.extractMessages();
    this.uiManager.updateSortButton(this.isSorted, this.messageManager.getMessageCount());
    if (this.isSorted) {
      this.sortManager.applyIncrementalSort();
    }
  }

  private toggleSort(): void {
    if (this.isSorted) {
      this.sortManager.restoreOriginalOrder();
    } else {
      this.sortManager.sortMessages();
    }
    this.isSorted = !this.isSorted;
    this.uiManager.updateSortButton(this.isSorted, this.messageManager.getMessageCount());
  }
}

const messagesManager = new LinkedInMessagesManager();
export { messagesManager };
