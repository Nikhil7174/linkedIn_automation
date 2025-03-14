import { Message } from "../lib/types";
export class UIManager {
    private containerId = 'linkedin-prioritizer-container';
  
    public addUI(toggleSortCallback: () => void): void {
      if (document.getElementById(this.containerId)) return;
  
      const container: HTMLDivElement = document.createElement('div');
      container.id = this.containerId;
      container.className = 'linkedin-prioritizer-container';
      const uiHTML: string = `
        <div class="ui-container">
          <button id="sort-toggle-button" class="sort-button">Sort</button>
          <span id="sort-status" class="sort-status"></span>
        </div>
      `;
      container.innerHTML = uiHTML;
  
      const targetContainer: Element | null = document.querySelector('.msg-conversations-container__conversations-list');
      if (targetContainer) {
        targetContainer.insertBefore(container, targetContainer.firstChild);
      } else {
        document.body.appendChild(container);
      }
  
      const sortButton = container.querySelector('#sort-toggle-button') as HTMLButtonElement;
      sortButton.addEventListener('click', toggleSortCallback);
    }
  
    public updateSortButton(isSorted: boolean, messageCount: number): void {
      const sortButton = document.getElementById('sort-toggle-button') as HTMLButtonElement;
      const sortStatus = document.getElementById('sort-status') as HTMLSpanElement;
      
      if (sortButton) {
        sortButton.textContent = isSorted ? 'Reset Order' : 'Sort';
      }
      
      if (sortStatus) {
        sortStatus.textContent = isSorted ? `${messageCount} messages sorted by priority` : '';
      }
    }

    public updateConversationCardIndicators(): void {
        chrome.storage.local.get(
          ['categorizedMessages'],
          (result: { categorizedMessages?: { high: string[] } }) => {
            // Retrieve high priority message previews from storage
            const categorized = result.categorizedMessages || { high: [] };
            const highPriorityPreviews = new Set(categorized.high);
            
            // Get all conversation cards on the page
            const conversationItems: NodeListOf<Element> =
              document.querySelectorAll('.msg-conversation-card');
            
            conversationItems.forEach((item: Element) => {
              // Extract the message preview text
              const preview: string =
                item.querySelector('.msg-conversation-card__message-snippet')?.textContent?.trim() || '';
              // Locate the sender element (the element containing the sender's name)
              const senderElement = item.querySelector('.msg-conversation-listitem__participant-names');
              
              if (highPriorityPreviews.has(preview)) {
                // Apply red underline for high priority messages
                if (senderElement) {
                  (senderElement as HTMLElement).style.textDecoration = "underline";
                  (senderElement as HTMLElement).style.textDecorationColor = "#FF5252"; // red color
                  (senderElement as HTMLElement).style.textDecorationThickness = "2px";
                  senderElement.setAttribute('title', 'High Priority');
                }
              } else {
                // For normal messages, remove any custom styling (if previously applied)
                if (senderElement) {
                  (senderElement as HTMLElement).style.textDecoration = "";
                  senderElement.removeAttribute('title');
                }
              }
            });
          }
        );
      }
      
      
  }
  