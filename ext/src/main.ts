import { Message, CategorizedMessages, Priority } from "./lib/types";
import "../src/popup/styles/style.css"

class LinkedInMessagesManager {
  private messages: Message[] = [];
  private lastUrl: string = location.href;
  private urlObserver: MutationObserver;
  private messageListObserver: MutationObserver;
  private lastMessageCount: number = 0;
  private conversationPreviews: Map<string, string> = new Map();

  constructor() {
    this.urlObserver = new MutationObserver(this.handleUrlChange.bind(this));
    this.messageListObserver = new MutationObserver(this.handleMessageListChange.bind(this));
    chrome.runtime.onMessage.addListener(this.handleRuntimeMessages.bind(this));
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.initializeObservers();
        this.extractMessages();
        this.addUI(); // Inject UI on load
        this.updateConversationCardIndicators();
      }, 2000);
    });
    this.urlObserver.observe(document, { subtree: true, childList: true });
  }

  private initializeObservers(): void {
    const messageContainer = document.querySelector('.msg-conversations-container__conversations-list');
    if (messageContainer) {
      this.messageListObserver.observe(messageContainer, { 
        childList: true,
        subtree: true
      });
      console.log("Observing message container for changes");
    } else {
      setTimeout(() => this.initializeObservers(), 1000);
    }
  }

  private handleUrlChange(): void {
    const url: string = location.href;
    if (url !== this.lastUrl) {
      this.lastUrl = url;
      this.messageListObserver.disconnect();
      setTimeout(() => {
        this.initializeObservers();
        this.extractMessages();
        this.addUI();
        this.updateConversationCardIndicators();
      }, 1000);
    }
  }

  private handleMessageListChange(mutations: MutationRecord[]): void {
    let contentChanged = false;
    let countChanged = false;
    const messageItems = document.querySelectorAll('.msg-conversation-card');
    countChanged = messageItems.length !== this.lastMessageCount;
    for (const mutation of mutations) {
      const isMessageContent = 
        mutation.target instanceof Element && 
        (mutation.target.querySelector('.msg-conversation-card__message-snippet') || 
         mutation.target.closest('.msg-conversation-card__message-snippet'));
      if (isMessageContent) {
        contentChanged = true;
        break;
      }
    }
    if (countChanged || contentChanged) {
      console.log(`Detected changes - Count changed: ${countChanged}, Content changed: ${contentChanged}`);
      this.checkForNewMessages();
      this.lastMessageCount = messageItems.length;
      this.updateConversationCardIndicators();
    }
  }

  private handleRuntimeMessages(
    request: { action: string; categories?: CategorizedMessages },
    sender: any,
    sendResponse: any
  ): void {
    if (request.action === 'messagesAnalyzed') {
      this.updateConversationCardIndicators();
    }
  }

  private checkForNewMessages(): void {
    console.log("Checking for new or updated messages...");
    if (window.location.href.includes('messaging')) {
      const conversationItems: NodeListOf<Element> = document.querySelectorAll('.msg-conversation-card');
      let newOrUpdatedMessages = false;
      conversationItems.forEach((item: Element) => {
        const senderElement: Element | null = item.querySelector('.msg-conversation-card__participant-names');
        const sender: string = senderElement ? senderElement.textContent?.trim() || 'Unknown' : 'Unknown';
        const previewElement: Element | null = item.querySelector('.msg-conversation-card__message-snippet');
        const preview: string = previewElement ? previewElement.textContent?.trim() || '' : '';
        const previousPreview = this.conversationPreviews.get(sender);
        if (previousPreview === undefined || previousPreview !== preview) {
          console.log(`New or updated message from ${sender}: "${preview}"`);
          this.conversationPreviews.set(sender, preview);
          if (previousPreview !== preview) {
            const timeElement: Element | null = item.querySelector('.msg-conversation-card__time-stamp');
            const timestamp: string = timeElement ? timeElement.textContent?.trim() || '' : '';
            const link: string = item.getAttribute('href') || '';
            const message: Message = {
              sender,
              preview,
              timestamp,
              link,
              analyzed: false,
              priority: 'unassigned'
            };
            this.messages.unshift(message);
            newOrUpdatedMessages = true;
          }
        }
      });
      if (newOrUpdatedMessages) {
        console.log(`Updated message collection: ${this.messages.length} messages`);
        this.saveMessagesToStorage();
      }
    }
  }

  public extractMessages(): void {
    console.log("Extracting all LinkedIn messages...");
    if (window.location.href.includes('messaging')) {
      const conversationItems: NodeListOf<Element> = document.querySelectorAll('.msg-conversation-card');
      if (conversationItems.length > 0) {
        this.messages = [];
        this.conversationPreviews.clear();
        this.lastMessageCount = conversationItems.length;
        conversationItems.forEach((item: Element) => {
          const senderElement: Element | null = item.querySelector('.msg-conversation-card__participant-names');
          const sender: string = senderElement ? senderElement.textContent?.trim() || 'Unknown' : 'Unknown';
          const previewElement: Element | null = item.querySelector('.msg-conversation-card__message-snippet');
          const preview: string = previewElement ? previewElement.textContent?.trim() || '' : '';
          const timeElement: Element | null = item.querySelector('.msg-conversation-card__time-stamp');
          const timestamp: string = timeElement ? timeElement.textContent?.trim() || '' : '';
          const link: string = item.getAttribute('href') || '';
          this.conversationPreviews.set(sender, preview);
          const message: Message = {
            sender,
            preview,
            timestamp,
            link,
            analyzed: false,
            priority: 'unassigned'
          };
          this.messages.push(message);
        });
        console.log(`Extracted ${this.messages.length} messages`);
        this.saveMessagesToStorage();
      }
    }
  }

  private saveMessagesToStorage(): void {
    chrome.storage.local.set({ linkedInMessages: this.messages }, () => {
      console.log('Messages saved to storage');
      chrome.runtime.sendMessage({
        action: 'analyzeMessages',
        messages: this.messages
      });
    });
  }

  // Updated UI: single "Sort" button injected into the conversation container
  private addUI(): void {
    if (document.getElementById('linkedin-prioritizer-container')) {
      return;
    }
    const container: HTMLDivElement = document.createElement('div');
    container.id = 'linkedin-prioritizer-container';
    container.className = 'linkedin-prioritizer-container';
    const uiHTML: string = `
      <div class="ui-container">
        <button class="sort-button">Sort</button>
      </div>
    `;
    container.innerHTML = uiHTML;
    // Insert the UI inside the messaging container so it appears where the original buttons did
    const targetContainer: Element | null = document.querySelector('.msg-conversations-container__conversations-list');
    if (targetContainer) {
      console.log("yess")
      targetContainer.insertBefore(container, targetContainer.firstChild);
    } else {
      document.body.appendChild(container);
    }
    const sortButton = container.querySelector('.sort-button') as HTMLButtonElement;
    sortButton.addEventListener('click', () => {
      this.sortMessages();
    });
  }

  private updateConversationCardIndicators(): void {
    chrome.storage.local.get(
      ['linkedInMessages', 'categorizedMessages'],
      (result: {
        linkedInMessages?: Message[];
        categorizedMessages?: CategorizedMessages;
      }) => {
        const categorized: CategorizedMessages =
          result.categorizedMessages || { high: [], medium: [], low: [] };
        const previewToPriority = new Map<string, Priority>();
        for (const preview of categorized.high) {
          previewToPriority.set(preview, 'high');
        }
        for (const preview of categorized.medium) {
          previewToPriority.set(preview, 'medium');
        }
        for (const preview of categorized.low) {
          previewToPriority.set(preview, 'low');
        }
        const conversationItems: NodeListOf<Element> =
          document.querySelectorAll('.msg-conversation-card');
        conversationItems.forEach((item: Element) => {
          const preview: string =
            item.querySelector('.msg-conversation-card__message-snippet')?.textContent?.trim() || '';
          const priority = previewToPriority.get(preview) || 'unassigned';
          let color = '#CCCCCC';
          if (priority === 'high') {
            color = '#FF5252';
          } else if (priority === 'medium') {
            color = 'blue';
          } else if (priority === 'low') {
            color = 'gray';
          }
          const senderElement = item.querySelector('.msg-conversation-listitem__participant-names');
          if (senderElement) {
            (senderElement as HTMLElement).style.textDecoration = "underline";
            (senderElement as HTMLElement).style.textDecorationColor = color;
            (senderElement as HTMLElement).style.textDecorationThickness = "2px";
            senderElement.setAttribute('title', `Priority: ${priority}`);
          }
        });
      }
    );
  }
  
  private sortMessages(priorityFilter: Priority | 'all' = 'all'): void {
    const container = document.querySelector('.msg-conversations-container__conversations-list');
    if (!container) return;
  
    // Preserve scroll state and container reference
    const scrollParent = container.parentElement!;
    const initialScroll = scrollParent.scrollTop;
    const sortButton = document.getElementById('linkedin-prioritizer-container');
  
    // 1. Clone elements while keeping original container in DOM
    const fragment = document.createDocumentFragment();
    const liElements = Array.from(container.querySelectorAll('li.msg-conversation-listitem'));
    
    // 2. Sort elements in memory
    chrome.storage.local.get(['categorizedMessages'], (result) => {
      const categorized = result.categorizedMessages || { high: [], medium: [], low: [] };
      const prioritySets = {
        high: new Set(categorized.high),
        medium: new Set(categorized.medium),
        low: new Set(categorized.low)
      };
  
      liElements.sort((a, b) => {
        const getPriority = (element: Element) => {
          const preview = element.querySelector('.msg-conversation-card__message-snippet')?.textContent?.trim() || '';
          return prioritySets.high.has(preview) ? 3 : 
                 prioritySets.medium.has(preview) ? 2 : 
                 prioritySets.low.has(preview) ? 1 : 0;
        };
        return getPriority(b) - getPriority(a);
      });
  
      // 3. Reattach sorted elements using requestAnimationFrame
      requestAnimationFrame(() => {
        // Temporary disable observer during DOM manipulation
        this.messageListObserver.disconnect();
  
        // Atomic DOM update
        liElements.forEach(li => fragment.appendChild(li));
        container.innerHTML = '';
        container.appendChild(fragment);
  
        // Restore scroll position and UI elements
        scrollParent.scrollTop = initialScroll;
        if (sortButton) container.parentElement?.prepend(sortButton);
  
        // Re-enable observer after a small delay
        setTimeout(() => {
          this.initializeObservers();
        }, 100);
      });
    });
  }
  
}

const messagesManager = new LinkedInMessagesManager();
export { messagesManager };
