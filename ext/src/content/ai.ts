import { IMessage, IUserPreferences } from '../lib/types';

export class MessagePrioritizer {
  private keywordPatterns: {
    high: RegExp[];
    medium: RegExp[];
    low: RegExp[];
  };

  public importantContacts: string[];

  constructor() {
    // Keywords and phrases for each priority level
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
      ],
      medium: [
        /connect/i,
        /introduction/i,
        /referral/i,
        /manager/i,
        /lead/i,
        /team/i,
        /project/i,
        /collaboration/i,
        /information/i,
        /inquiry/i,
        /question/i,
        /interested/i,
        /feedback/i,
        /review/i,
        /schedule/i,
        /resume/i,
        /recruiter/i
      ],
      low: [
        /newsletter/i,
        /update/i,
        /subscription/i,
        /invitation/i,
        /event/i,
        /webinar/i,
        /network/i,
        /service/i,
        /promotion/i,
        /thanks/i,
        /thank you/i,
        /looking to connect/i,
        /would like to add you/i,
        /in my network/i,
        /reach out/i,
        /looking forward/i
      ]
    };

    this.importantContacts = [];
  }

  public categorizeMessages(messages: IMessage[]): { high: string[]; medium: string[]; low: string[] } {
    const categorized = {
      high: [] as string[],
      medium: [] as string[],
      low: [] as string[]
    };

    messages.forEach((message) => {
      const priority = this.determineMessagePriority(message);
      categorized[priority].push(message.link);
      message.priority = priority;
    });

    return categorized;
  }

  public determineMessagePriority(message: IMessage): 'high' | 'medium' | 'low' {
    const senderImportance = this.checkSenderImportance(message.sender);
    const contentPriority = this.analyzeMessageContent(message.preview);
    const recencyFactor = this.analyzeTimestamp(message.timestamp);

    const priorityScore = senderImportance + contentPriority + recencyFactor;

    if (priorityScore >= 4) {
      return 'high';
    } else if (priorityScore >= 2) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private checkSenderImportance(sender: string): number {
    if (this.importantContacts.some((contact) => sender.includes(contact))) {
      return 3; // High importance
    }

    if (/CEO|CTO|CFO|COO|Director|VP|President|Founder|Partner|Hiring|Recruiter/i.test(sender)) {
      return 2; // Medium-high importance
    }

    return 0;
  }

  private analyzeMessageContent(content?: string): number {
    if (!content) return 0;

    for (const pattern of this.keywordPatterns.high) {
      if (pattern.test(content)) {
        return 2;
      }
    }

    for (const pattern of this.keywordPatterns.medium) {
      if (pattern.test(content)) {
        return 1;
      }
    }

    for (const pattern of this.keywordPatterns.low) {
      if (pattern.test(content)) {
        return 0;
      }
    }

    return 0;
  }

  // Analyze the timestamp to boost priority for recent messages
  private analyzeTimestamp(timestamp?: string): number {
    if (!timestamp) return 0;

    if (/just now|minute|hour|today/i.test(timestamp)) {
      return 1;
    }

    return 0;
  }

  public addImportantContact(contact: string): boolean {
    if (!this.importantContacts.includes(contact)) {
      this.importantContacts.push(contact);
      return true;
    }
    return false;
  }

  public removeImportantContact(contact: string): boolean {
    const index = this.importantContacts.indexOf(contact);
    if (index > -1) {
      this.importantContacts.splice(index, 1);
      return true;
    }
    return false;
  }

  public loadUserPreferences(preferences: IUserPreferences): void {
    if (preferences.importantContacts) {
      this.importantContacts = preferences.importantContacts;
    }

    if (preferences.customKeywords) {
      for (const priority in preferences.customKeywords) {
        if (this.keywordPatterns.hasOwnProperty(priority)) {
          const custom = preferences.customKeywords[priority as keyof IUserPreferences['customKeywords']];
          if (custom) {
            this.keywordPatterns[priority as 'high' | 'medium' | 'low'] = [
              ...this.keywordPatterns[priority as 'high' | 'medium' | 'low'],
              ...custom
            ];
          }
        }
      }
    }
  }
}
