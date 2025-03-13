import { MessagePrioritizer } from "./content/ai";
import { 
  UserPreferences, 
  LinkedInMessage, 
  IMessage, 
  IUserPreferences 
} from "./lib/types";

export class BackgroundManager {
  private prioritizer: MessagePrioritizer;

  constructor() {
    this.prioritizer = new MessagePrioritizer();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.loadUserPreferences();
    this.registerMessageListeners();
    this.registerInstallListener();
  }

  private async loadUserPreferences(): Promise<void> {
    try {
      const result: { userPreferences?: UserPreferences } =
        await chrome.storage.local.get(['userPreferences']);
      if (result.userPreferences) {
        const userPrefs: IUserPreferences = {
          importantContacts: result.userPreferences.importantContacts,
          automationSettings: result.userPreferences.automationSettings
            ? {
                enabled: result.userPreferences.automationSettings.enabled,
                templates: result.userPreferences.automationSettings.templates || undefined,
              }
            : undefined,
        };
        this.prioritizer.loadUserPreferences(userPrefs);
      }
    } catch (error) {
      console.error('Error loading user preferences', error);
    }
  }

  private registerMessageListeners(): void {
    chrome.runtime.onMessage.addListener(async (
      request: { action: string; messages?: LinkedInMessage[]; contact?: string },
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      if (request.action === 'analyzeMessages' && request.messages) {
        await this.handleAnalyzeMessages(request.messages, sendResponse);
        return true; // Keep message channel open for async response
      }
      
      if (request.action === 'addImportantContact' && request.contact) {
        const added = this.prioritizer.addImportantContact(request.contact);
        await this.saveUserPreferences();
        sendResponse({ success: added });
      }
      
      if (request.action === 'removeImportantContact' && request.contact) {
        const removed = this.prioritizer.removeImportantContact(request.contact);
        await this.saveUserPreferences();
        sendResponse({ success: removed });
      }
    });
  }

  private registerInstallListener(): void {
    chrome.runtime.onInstalled.addListener(async (details: chrome.runtime.InstalledDetails) => {
      if (details.reason === 'install') {
        await this.setDefaultStorageValues();
      }
    });
  }

  private async handleAnalyzeMessages(
    messages: LinkedInMessage[],
    sendResponse?: (response?: any) => void
  ): Promise<void> {
    console.log('Background script received messages for analysis');
    console.log("LinkedInMessage---------------", messages);
    
    const iMessages: IMessage[] = messages.map(msg => ({
      link: msg.links?.[0] || "",
      sender: msg.sender,
      preview: msg.preview,
      timestamp: new Date().toISOString(),
      // This default assignment will be updated in categorizeMessages()
      priority: msg.priority === 1 ? "high" :
                msg.priority === 2 ? "medium" : "low",
    }));

    console.log("iMessages", iMessages)
    
    iMessages.forEach(ms => console.log("ims", ms));
    
    const categorizedMessages = this.prioritizer.categorizeMessages(iMessages);
    console.log("categorizedMessages", categorizedMessages);
    
    await chrome.storage.local.set({ 'categorizedMessages': categorizedMessages });
    console.log('Categorized messages saved to storage');
    
    await chrome.storage.local.set({ 'linkedInMessages': iMessages });
    console.log('Updated messages with priorities');
    
    const tabs: chrome.tabs.Tab[] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].id !== undefined) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'messagesAnalyzed',
        categories: categorizedMessages
      });
    }
    
    if (sendResponse) {
      sendResponse({ success: true });
    }
  }  

  private async saveUserPreferences(): Promise<void> {
    const preferences: Partial<UserPreferences> = {
      importantContacts: this.prioritizer.importantContacts
    };
    
    await chrome.storage.local.set({ 'userPreferences': preferences });
    console.log('User preferences saved');
  }

  private async setDefaultStorageValues(): Promise<void> {
    await chrome.storage.local.set({
      'linkedInMessages': [],
      'categorizedMessages': { high: [], medium: [], low: [] },
      'userPreferences': {
        importantContacts: [],
        automationSettings: {
          enabled: false,
          templates: { high: "", medium: "", low: "" }
        }
      }
    });
    console.log('Default storage values set on installation');
  }
}

new BackgroundManager();
