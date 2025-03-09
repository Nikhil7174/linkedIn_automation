export interface LinkedInMessage {
    id: string;
    sender: string;
    content: string;
    links: string[];
    category?: 'job' | 'sales' | 'spam' | 'casual';
    priority: number;
  }
  
  export type MessageClassification = Pick<LinkedInMessage, 'category' | 'priority'>;
  
  export interface UserSettings {
    openaiKey: string;
    autoDeleteSales: boolean;
    priorityThreshold: number;
  }