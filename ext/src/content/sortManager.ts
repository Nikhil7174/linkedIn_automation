export class SortManager {
  private originalNodePositions: Map<string, number> = new Map();
  private isSorted: boolean = false;

  // Generate a unique ID based on sender and a snippet of the preview text
  private getConversationId(item: Element): string {
    const sender = item.querySelector('.msg-conversation-card__participant-names')?.textContent?.trim() || '';
    const preview = item.querySelector('.msg-conversation-card__message-snippet')?.textContent?.trim() || '';
    return `${sender}-${preview.substring(0, 20)}`;
  }

  public sortMessages(): void {
    // If already sorted, do nothing
    if (this.isSorted) return;
    
    const container = document.querySelector('.msg-conversations-container__conversations-list');
    if (!container) return;

    // Store original positions for later restoration
    this.originalNodePositions.clear();
    const items = Array.from(container.querySelectorAll('li.msg-conversation-listitem'));
    items.forEach((item, index) => {
      const id = this.getConversationId(item);
      this.originalNodePositions.set(id, index);
    });

    this.performSortWithPreservation(container, items);
    this.isSorted = true;
  }

  private performSortWithPreservation(container: Element, items: Element[]): void {
    chrome.storage.local.get(['categorizedMessages'], (result) => {
      const categorized = result.categorizedMessages || { high: [] };
      const prioritySet = new Set(categorized.high.map((item: { preview: string }) => item.preview));

      // Determine priority for each element based solely on the "high" category
      const getPriority = (element: Element) => {
        const preview = element.querySelector('.msg-conversation-card__message-snippet')?.textContent?.trim() || '';
        return prioritySet.has(preview) ? 1 : 0;
      };

      console.log("getPriority", getPriority)

      const itemPriorities = new Map<Element, number>();
      items.forEach(item => {
        itemPriorities.set(item, getPriority(item));
      });

      // Sort items by priority (highest first)
      const sortedItems = [...items].sort((a, b) => {
        return (itemPriorities.get(b) || 0) - (itemPriorities.get(a) || 0);
      });

      console.log(sortedItems, "----", prioritySet)

      // Reorder DOM elements based on sorted order
      this.reorderContainer(container, sortedItems);
      console.log("Sorting complete");
    });
  }

  private reorderContainer(container: Element, sortedItems: Element[]): void {
    console.log("sortedItems", sortedItems)

    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i];
      const currentIndex = Array.from(container.children).indexOf(item);
      if (currentIndex !== i) {
        if (i === 0) {
          // Insert at the beginning (skipping the UI container if needed)
          const firstChild = Array.from(container.children).find(
            child => child.id !== 'linkedin-prioritizer-container'
          );
          if (firstChild) {
            container.insertBefore(item, firstChild);
          } else {
            container.appendChild(item);
          }
        } else {
          // Insert before the item currently at the target index
          const refNode = container.children[i];
          container.insertBefore(item, refNode);
        }
      }
    }
  }

  public applyIncrementalSort(): void {
    // Only sort if we're already in a sorted state
    if (!this.isSorted) return;
    
    const container = document.querySelector('.msg-conversations-container__conversations-list');
    if (!container) return;
    const items = Array.from(container.querySelectorAll('li.msg-conversation-listitem'));
    this.performSortWithPreservation(container, items);
  }

  public restoreOriginalOrder(): void {
    // Only restore if we're in a sorted state
    if (!this.isSorted) return;
    
    const container = document.querySelector('.msg-conversations-container__conversations-list');
    if (!container || this.originalNodePositions.size === 0) return;

    const items = Array.from(container.querySelectorAll('li.msg-conversation-listitem'));
    const sortedItems = [...items].sort((a, b) => {
      const aId = this.getConversationId(a);
      const bId = this.getConversationId(b);
      const aPos = this.originalNodePositions.get(aId) ?? 999;
      const bPos = this.originalNodePositions.get(bId) ?? 999;
      return aPos - bPos;
    });

    console.log("sortedItems", sortedItems)

    sortedItems.forEach(item => {
      container.appendChild(item);
    });
    console.log("Restored original order");
    this.isSorted = false;
  }
}
