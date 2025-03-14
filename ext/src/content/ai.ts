import { IMessage, IUserPreferences } from '../lib/types';

export class MessagePrioritizer {
  private keywordPatterns: {
    high: RegExp[];
  };

  public importantContacts: string[];

  constructor() {
    // High-priority keywords and phrases only
    this.keywordPatterns = {
      high: [
        /urgent/i,
        /asap/i,
        /immediate/i,
        /opportunity/i,
        /job offer/i,
        /interview/i,
        /deadline/i,
        /important/i,
        /crucial/i,
        /CEO|CTO|CFO|COO/i,
        /director/i,
        /VP|Vice President/i,
        /follow[-]?up/i,
        /meeting\.request/i,
        /contract/i,
        /proposal/i,
        /partnership/i,
        /acquisition/i,
        /investment/i
      ]
    };

    this.importantContacts = [];
    
    // Load important contacts from storage on initialization
    this.loadImportantContactsFromStorage();
  }

  private loadImportantContactsFromStorage(): void {
    chrome.storage.local.get(['importantContacts'], (result) => {
      if (result.importantContacts && Array.isArray(result.importantContacts)) {
        this.importantContacts = result.importantContacts;
        console.log('Loaded important contacts from storage:', this.importantContacts);
      }
    });
  }

  private saveImportantContactsToStorage(): void {
    chrome.storage.local.set({ importantContacts: this.importantContacts }, () => {
      console.log('Saved important contacts to storage:', this.importantContacts);
    });
  }

  // Filters and returns only the high-priority messages
  public filterHighPriorityMessages(messages: IMessage[]): { high: string[] } {
    console.log("Filtering high priority messages:", messages);
    const filtered = { high: [] as string[] };

    messages.forEach((message) => {
      if (this.isHighPriority(message)) {
        filtered.high.push(message.preview);
        message.priority = 'high';
      }
    });
    console.log("Filtered results:", filtered);
    return filtered;
  }

  // Determines if a message qualifies as high priority
  public isHighPriority(message: IMessage): boolean {
    if (this.isImportantContact(message.sender)) {
      return true;
    }
    
    if (this.keywordPatterns.high.some(pattern => pattern.test(message.preview))) {
      return true;
    }

    if (this.analyzeTimestamp(message.timestamp) > 0) {
      return true;
    }

    return false;
  }
  
  private isImportantContact(sender: string): boolean {
    return this.importantContacts.some(contact => 
      sender.toLowerCase().includes(contact.toLowerCase())
    );
  }

  // Analyze the timestamp to boost priority for recent messages
  private analyzeTimestamp(timestamp?: string): number {
    if (!timestamp) return 0;
    if (/just now|minute|hour|today/i.test(timestamp)) {
      console.log("Recent message timestamp:", timestamp);
      return 1;
    }
    return 0;
  }

  public addImportantContact(contact: string): boolean {
    if (!this.importantContacts.includes(contact)) {
      this.importantContacts.push(contact);
      this.saveImportantContactsToStorage();
      return true;
    }
    return false;
  }

  public removeImportantContact(contact: string): boolean {
    const index = this.importantContacts.indexOf(contact);
    if (index > -1) {
      this.importantContacts.splice(index, 1);
      this.saveImportantContactsToStorage();
      return true;
    }
    return false;
  }

  public loadUserPreferences(preferences: IUserPreferences): void {
    if (preferences.importantContacts) {
      this.importantContacts = preferences.importantContacts;
      this.saveImportantContactsToStorage();
    }

    // If custom high-priority keywords are provided, merge them
    if (preferences.customKeywords && preferences.customKeywords.high) {
      this.keywordPatterns.high = [
        ...this.keywordPatterns.high,
        ...preferences.customKeywords.high
      ];
    }
  }
}
