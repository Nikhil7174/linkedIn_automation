import { MessagePrioritizer } from "./content/ai";
import { 
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
      const result: { userPreferences?: IUserPreferences } =
        await chrome.storage.local.get(['userPreferences']);
      if (result.userPreferences) {
        // Pass the complete user preferences
        this.prioritizer.loadUserPreferences(result.userPreferences);
        console.log("Loaded user preferences:", result.userPreferences);
      }
    } catch (error) {
      console.error('Error loading user preferences', error);
    }
  }

  private registerMessageListeners(): void {
    chrome.runtime.onMessage.addListener(async (
      request: { 
        action: string; 
        messages?: LinkedInMessage[]; 
        contact?: string; 
        method?: string 
      },
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      if (request.action === 'analyzeMessages' && request.messages) {
        await this.handleAnalyzeMessages(request.messages, request.method || 'rule', sendResponse);
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
    method: string = "rule", // Default to rule-based sorting
    sendResponse?: (response?: any) => void
  ): Promise<void> {
    console.log('Background script received messages for analysis');
    console.log("LinkedInMessage:", messages);
    
    const iMessages: IMessage[] = messages.map(msg => ({
      link: msg.links?.[0] || "",
      sender: msg.sender,
      preview: msg.preview,
      timestamp: new Date().toISOString(),
      priority: "",
      keywords: [] // Initialize keywords as an empty array
    }));

    let analyzedMessages: IMessage[] = [];
    console.log("Method selected:", method);

    if (method === "ai") {
      console.log("Using AI-based sorting...");
      analyzedMessages = await this.performAiSorting(iMessages);
    } else {
      console.log("Using rule-based prioritizer...");
      // Use the prioritizer for rule-based sorting
      analyzedMessages = iMessages.map(msg => ({...msg})); // Create a copy
      
      // Process messages with the prioritizer
      // The filterHighPriorityMessages method will modify the messages in-place
      // by setting the priority field to 'high' for high priority messages
      const highPriorityResults = this.prioritizer.filterHighPriorityMessages(analyzedMessages);
      
      console.log("High priority messages:", highPriorityResults.high);
    }
    
    console.log("Analyzed Messages:", analyzedMessages);
    
    // Create categorized messages object for storage
    const categorizedMessages = {
      high: analyzedMessages.filter(m => m.priority === "high")
    };
    
    await chrome.storage.local.set({ 'categorizedMessages': categorizedMessages });
    console.log('Categorized messages saved to storage');
    
    await chrome.storage.local.set({ 'linkedInMessages': analyzedMessages });
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

  private async performAiSorting(messages: IMessage[]): Promise<IMessage[]> {
    const analyzedMessages: IMessage[] = [];
    // Helper function for delay (ms)
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const message of messages) {
      try {
        const response = await fetch("http://localhost:3001/check-high-priority", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            highPriorityKeywords: ["offer", "job", "urgent", "important"],
            previewText: message.preview,
          }),
        });
        const data = await response.json();
        console.log("AI Response:", data);

        // Use the Gemini API server's dynamic response
        if (data.isHighPriority) {
          message.priority = "high";
          message.keywords = data.keywords;
        } else {
          message.priority = "";
        }
      } catch (error) {
        console.error("Error analyzing message:", error);
        message.priority = "";
      }
      analyzedMessages.push({...message});

      // Wait 5 seconds before processing the next message
      await delay(5000);
    }

    return analyzedMessages;
  }

  private async saveUserPreferences(): Promise<void> {
    const preferences: Partial<IUserPreferences> = {
      importantContacts: this.prioritizer.importantContacts,
      // Include any other properties that should be saved
    };
    
    await chrome.storage.local.set({ 'userPreferences': preferences });
    console.log('User preferences saved');
  }

  private async setDefaultStorageValues(): Promise<void> {
    await chrome.storage.local.set({
      'linkedInMessages': [],
      'categorizedMessages': { high: [] },
      'userPreferences': {
        importantContacts: [],
        priorityTags: [], // Include priorityTags as needed by MessagePrioritizer
        automationSettings: {
          enabled: false,
          templates: { high: "" }
        }
      }
    });
    console.log('Default storage values set on installation');
  }
}

new BackgroundManager();
