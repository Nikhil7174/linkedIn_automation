import { Message, CategorizedMessages, Priority } from "./lib/types";

class LinkedInMessagesManager {
  private messages: Message[] = [];
  private lastUrl: string = location.href;
  private observer: MutationObserver;

  constructor() {
    this.observer = new MutationObserver(this.handleUrlChange.bind(this));
    
    chrome.runtime.onMessage.addListener(this.handleRuntimeMessages.bind(this));
    
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.extractMessages();
        this.addMessageCategorizationUI();
      }, 2000);
    });
    
    this.observer.observe(document, { subtree: true, childList: true });
  }

  private handleUrlChange(): void {
    const url: string = location.href;
    if (url !== this.lastUrl) {
      this.lastUrl = url;
      setTimeout(() => {
        this.extractMessages();
        this.addMessageCategorizationUI();
      }, 2000);
    }
  }

  private handleRuntimeMessages(
    request: { action: string; categories?: CategorizedMessages },
    sender: any,
    sendResponse: any
  ): void {
    if (request.action === 'messagesAnalyzed') {
      console.log('Messages analyzed:', request.categories);
      this.displayMessages('all');
    }
  }

  public extractMessages(): void {
    console.log("Extracting LinkedIn messages...");

    if (window.location.href.includes('messaging')) {
      const conversationItems: NodeListOf<Element> =
        document.querySelectorAll('.msg-conversation-card');

      if (conversationItems.length > 0) {
        this.messages = [];

        conversationItems.forEach((item: Element) => {
          const senderElement: Element | null = item.querySelector('.msg-conversation-card__participant-names');
          const sender: string =
            senderElement ? senderElement.textContent?.trim() || 'Unknown' : 'Unknown';

          const previewElement: Element | null = item.querySelector('.msg-conversation-card__message-snippet');
          const preview: string =
            previewElement ? previewElement.textContent?.trim() || '' : '';

          const timeElement: Element | null = item.querySelector('.msg-conversation-card__timestamp');
          const timestamp: string =
            timeElement ? timeElement.textContent?.trim() || '' : '';

          const link: string = item.getAttribute('href') || '';

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

        chrome.storage.local.set({ linkedInMessages: this.messages }, () => {
          console.log('Messages saved to storage');
          chrome.runtime.sendMessage({
            action: 'analyzeMessages',
            messages: this.messages
          });
        });
      }
    }
  }

  private addMessageCategorizationUI(): void {
    if (window.location.href.includes('messaging')) {
      if (document.getElementById('linkedin-prioritizer-container')) {
        return;
      }

      const container: HTMLDivElement = document.createElement('div');
      container.id = 'linkedin-prioritizer-container';
      container.className = 'linkedin-prioritizer-container';

      const tabsHTML: string = `
        <div class="prioritizer-tabs">
          <button class="tab-button active" data-priority="all">All</button>
          <button class="tab-button" data-priority="high">High Priority</button>
          <button class="tab-button" data-priority="medium">Medium Priority</button>
          <button class="tab-button" data-priority="low">Low Priority</button>
        </div>
        <div class="prioritizer-content">
          <div id="messages-container" class="messages-container"></div>
        </div>
      `;

      container.innerHTML = tabsHTML;

      const messageListContainer: Element | null = document.querySelector('.msg-conversations-container');
      if (messageListContainer && messageListContainer.parentNode) {
        messageListContainer.parentNode.insertBefore(container, messageListContainer);

        const tabButtons: NodeListOf<HTMLButtonElement> = document.querySelectorAll('.tab-button');
        tabButtons.forEach((button: HTMLButtonElement) => {
          button.addEventListener('click', (event: MouseEvent) => {
            const clickedButton = event.currentTarget as HTMLButtonElement;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            clickedButton.classList.add('active');
            this.displayMessages(clickedButton.getAttribute('data-priority') as Priority);
          });
        });

        this.displayMessages('all');
      }
    }
  }

  public displayMessages(priority: Priority): void {
    chrome.storage.local.get(
      ['linkedInMessages', 'categorizedMessages'],
      (result: {
        linkedInMessages?: Message[];
        categorizedMessages?: CategorizedMessages;
      }) => {
        const allMessages: Message[] = result.linkedInMessages || [];
        const categorized: CategorizedMessages =
          result.categorizedMessages || { high: [], medium: [], low: [] };

        const messagesContainer: HTMLElement | null = document.getElementById('messages-container');
        if (!messagesContainer) return;
        messagesContainer.innerHTML = '';

        let displayMsgs: Message[] = [];

        if (priority === 'all') {
          displayMsgs = allMessages;
        } else {
          displayMsgs = allMessages.filter((msg: Message) =>
            categorized[priority].some((id: string) => id === msg.link)
          );
        }

        // Create message elements
        displayMsgs.forEach((message: Message) => {
          const msgElement: HTMLDivElement = document.createElement('div');
          msgElement.className = `prioritizer-message priority-${message.priority}`;

          msgElement.innerHTML = `
            <div class="message-header">
              <span class="message-sender">${message.sender}</span>
              <span class="message-time">${message.timestamp}</span>
            </div>
            <div class="message-preview">${message.preview}</div>
          `;

          msgElement.addEventListener('click', () => {
            if (message.link) {
              window.location.href = message.link;
            }
          });

          messagesContainer.appendChild(msgElement);
        });

        if (displayMsgs.length === 0) {
          messagesContainer.innerHTML = '<div class="no-messages">No messages in this category</div>';
        }
      }
    );
  }
}

const messagesManager = new LinkedInMessagesManager();

export { messagesManager };