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

  private initialize(): void {
    this.loadUserPreferences();
    this.registerMessageListeners();
    this.registerInstallListener();
  }

  private loadUserPreferences(): void {
    chrome.storage.local.get(['userPreferences'], (result: { userPreferences?: UserPreferences }) => {
      if (result.userPreferences) {
        // Convert to IUserPreferences by ensuring automationSettings.templates is defined (or remains undefined).
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
    });
  }

  private registerMessageListeners(): void {
    chrome.runtime.onMessage.addListener((
      request: { action: string; messages?: LinkedInMessage[]; contact?: string },
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      if (request.action === 'analyzeMessages' && request.messages) {
        this.handleAnalyzeMessages(request.messages, sendResponse);
        return true; // Keep message channel open for async response
      }
      
      if (request.action === 'addImportantContact' && request.contact) {
        const added = this.prioritizer.addImportantContact(request.contact);
        this.saveUserPreferences();
        sendResponse({ success: added });
      }
      
      if (request.action === 'removeImportantContact' && request.contact) {
        const removed = this.prioritizer.removeImportantContact(request.contact);
        this.saveUserPreferences();
        sendResponse({ success: removed });
      }
    });
  }

  private registerInstallListener(): void {
    chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
      if (details.reason === 'install') {
        this.setDefaultStorageValues();
      }
    });
  }

  private handleAnalyzeMessages(messages: LinkedInMessage[], sendResponse?: (response?: any) => void): void {
    console.log('Background script received messages for analysis');
    
    const iMessages: IMessage[] = messages.map(msg => ({
      link: msg.links[0] || "",           
      sender: msg.sender,
      preview: msg.content,               
      timestamp: new Date().toISOString(), 
      priority: msg.priority === 1 ? "high" :
                msg.priority === 2 ? "medium" : "low",
    }));
    const categorizedMessages = this.prioritizer.categorizeMessages(iMessages);
    
    chrome.storage.local.set({ 'categorizedMessages': categorizedMessages }, () => {
      console.log('Categorized messages saved to storage');
      
      const iMessages: IMessage[] = messages.map(msg => ({
        link: msg.links[0] || "",           
        sender: msg.sender,
        preview: msg.content,               
        timestamp: new Date().toISOString(), 
        priority: msg.priority === 1 ? "high" :
                  msg.priority === 2 ? "medium" : "low",
      }));
      
      chrome.storage.local.set({ 'linkedInMessages': iMessages }, () => {
        console.log('Updated messages with priorities');
        
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
          if (tabs[0] && tabs[0].id !== undefined) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'messagesAnalyzed',
              categories: categorizedMessages
            });
          }
        });
        
        if (sendResponse) {
          sendResponse({ success: true });
        }
      });
    });
  }

  private saveUserPreferences(): void {
    const preferences: Partial<UserPreferences> = {
      importantContacts: this.prioritizer.importantContacts
    };
    
    chrome.storage.local.set({ 'userPreferences': preferences }, () => {
      console.log('User preferences saved');
    });
  }

  private setDefaultStorageValues(): void {
    chrome.storage.local.set({
      'linkedInMessages': [],
      'categorizedMessages': { high: [], medium: [], low: [] },
      'userPreferences': {
        importantContacts: [],
        automationSettings: {
          enabled: false,
          templates: { high: "", medium: "", low: "" }
        }
      }
    }, () => {
      console.log('Default storage values set on installation');
    });
  }
}

new BackgroundManager();
