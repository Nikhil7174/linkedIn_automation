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

    // Listen for messages from the popup
    chrome.runtime.onMessage.addListener(this.handleMessages.bind(this));

    window.addEventListener('load', () => {
      setTimeout(() => {
        this.observerManager.initialize();
        this.messageManager.extractMessages();
        // No longer adding UI elements to LinkedIn page
        this.uiManager.updateConversationCardIndicators();
      }, 2000);
    });
  }

  private handleMessages(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): void {
    if (message.action === 'toggleSort') {
      this.toggleSort();
      sendResponse({ success: true, isSorted: this.isSorted });
    } else if (message.action === 'getState') {
      sendResponse({ 
        isSorted: this.isSorted,
        messageCount: this.messageManager.getMessageCount() 
      });
    } else if (message.action === 'extractMessages') {
      this.messageManager.extractMessages();
      sendResponse({ success: true });
    }
  }

  private handleUrlOrMessageChange(): void {
    // Handle URL changes or new messages detected by ObserverManager
    this.messageManager.extractMessages();
    
    // Notify popup about state changes
    chrome.runtime.sendMessage({
      action: 'stateUpdate',
      data: {
        isSorted: this.isSorted,
        messageCount: this.messageManager.getMessageCount()
      }
    });
    
    if (this.isSorted) {
      this.sortManager.applyIncrementalSort();
    }
  }

  private toggleSort(): void {
    if (this.isSorted) {
      // Reset: restore original order and reconnect observers
      // this.sortManager.restoreOriginalOrder();
      this.observerManager.reconnectObservers();
    } else {
      // Sort: apply sort and disconnect observers to prevent repeated sorting
      this.sortManager.sortMessages();
      this.observerManager.disconnectObservers();
    }
    this.isSorted = !this.isSorted;
  
    // Notify popup about state changes
    chrome.runtime.sendMessage({
      action: 'stateUpdate',
      data: {
        isSorted: this.isSorted,
        messageCount: this.messageManager.getMessageCount()
      }
    });
  }
}

const messagesManager = new LinkedInMessagesManager();
export { messagesManager };
