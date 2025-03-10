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

export interface Message {
    sender: string;
    preview: string;
    timestamp: string;
    link: string;
    analyzed: boolean;
    priority: "unassigned" | "high" | "medium" | "low";
}

export interface CategorizedMessages {
    high: string[];
    medium: string[];
    low: string[];
}

export type Priority = "all" | "high" | "medium" | "low";

export interface CategorizedMessages {
    high: string[];
    medium: string[];
    low: string[];
}

export interface AutomationTemplates {
    high: string;
    medium: string;
    low: string;
}

export interface AutomationSettings {
    enabled: boolean;
    templates?: AutomationTemplates;
}

export interface UserPreferences {
    importantContacts?: string[];
    automationSettings?: AutomationSettings;
}
