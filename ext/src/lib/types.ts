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

export interface IMessage {
    link: string;
    priority?: 'high' | 'medium' | 'low';
    sender: string;
    preview: string;
    timestamp: string;
    responded?: boolean;
}

export interface IUserPreferences {
    importantContacts?: string[];
    customKeywords?: {
        high?: RegExp[];
        medium?: RegExp[];
        low?: RegExp[];
    };
}

export interface IMessage {
    link: string;
    sender: string;
    priority?: 'high' | 'medium' | 'low';
    responded?: boolean;
}

export interface IAutomationSettings {
    enabled: boolean;
    templates?: {
        high: string;
        medium: string;
        low: string;
    };
}

export interface IUserPreferences {
    automationSettings?: IAutomationSettings;
}

export interface IAutomatedResponseResult {
    success: boolean;
    reason?: string;
    error?: string;
}

export interface IAutomationRequest {
    action: 'sendAutomatedResponse' | 'refreshMessages' | string;
    messageLink?: string;
    responseText?: string;
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

export interface IAutomationSettings {
    enabled: boolean;
    templates?: AutomationTemplates;
}

export interface IUserPreferences {
    importantContacts?: string[];
    automationSettings?: IAutomationSettings;
}

export interface LinkedInMessage {
    id: string;
    sender: string;
    content: string;
    links: string[];
    category?: 'job' | 'sales' | 'spam' | 'casual';
    priority: number;
}

export interface IMessage {
    link: string;
    sender: string;
    preview: string;
    priority?: "high" | "medium" | "low";
}