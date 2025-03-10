import { Message, CategorizedMessages, Priority } from "./lib/types";

let messages: Message[] = [];

// Function to extract LinkedIn messages
export const extractMessages = (): void => {
  console.log("Extracting LinkedIn messages...");

  if (window.location.href.includes('messaging')) {
    const conversationItems: NodeListOf<Element> =
      document.querySelectorAll('.msg-conversation-card');

    if (conversationItems.length > 0) {
      messages = [];

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

        messages.push(message);
      });

      console.log(`Extracted ${messages.length} messages`);

      chrome.storage.local.set({ linkedInMessages: messages }, () => {
        console.log('Messages saved to storage');
        chrome.runtime.sendMessage({
          action: 'analyzeMessages',
          messages: messages
        });
      });
    }
  }
}

const addMessageCategorizationUI = (): void => {
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
        button.addEventListener('click', function (this: HTMLButtonElement) {
          tabButtons.forEach(btn => btn.classList.remove('active'));
          this.classList.add('active');
          displayMessages(this.getAttribute('data-priority') as Priority);
        });
      });

      displayMessages('all');
    }
  }
}

// Function to display messages filtered by priority
export const displayMessages = (priority: Priority): void => {
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

chrome.runtime.onMessage.addListener(
  (request: { action: string; categories?: CategorizedMessages }, sender, sendResponse) => {
    if (request.action === 'messagesAnalyzed') {
      console.log('Messages analyzed:', request.categories);
      displayMessages('all');
    }
  }
);

window.addEventListener('load', () => {
  setTimeout(() => {
    extractMessages();
    addMessageCategorizationUI();
  }, 2000);
});

let lastUrl: string = location.href;
const observer: MutationObserver = new MutationObserver(() => {
  const url: string = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(() => {
      extractMessages();
      addMessageCategorizationUI();
    }, 2000);
  }
});
observer.observe(document, { subtree: true, childList: true });
