import { IMessage, IAutomationSettings, IUserPreferences } from '../lib/types';

export class MessageAutomation {
  private _enabled: boolean = false;
  private templates: { high: string; medium: string; low: string } = { high: '', medium: '', low: '' };

  constructor() {
    this.enabled = false;
    this.templates = {
      high: "",
      medium: "",
      low: ""
    };
  }

  public get enabled(): boolean {
    return this._enabled;
  }

  public set enabled(value: boolean) {
    this._enabled = value;
  }

  public setTemplates(templates: { high: string; medium: string; low: string }): void {
    this.templates = templates;
  }

  public getTemplates(): { high: string; medium: string; low: string } {
    return this.templates;
  }

  public init(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['userPreferences'], (result: { userPreferences?: IUserPreferences }) => {
        if (result.userPreferences && result.userPreferences.automationSettings) {
          const settings: IAutomationSettings = result.userPreferences.automationSettings;
          this.enabled = settings.enabled || false;
          this.templates = settings.templates || { high: "", medium: "", low: "" };
        }
        resolve();
      });
    });
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getTemplate(priority: 'high' | 'medium' | 'low'): string {
    return this.templates[priority] || "";
  }

  public async processMessage(message: IMessage): Promise<boolean> {
    if (!this.enabled) return false;

    const template = this.getTemplate(message.priority || 'low');
    if (!template) return false;

    const personalizedMessage = this.personalizeTemplate(template, message);
    return await this.sendResponse(message, personalizedMessage);
  }

  public personalizeTemplate(template: string, message: IMessage): string {
    const personalized = template
      .replace(/\{sender\}/g, message.sender.split(" ")[0]) // First name
      .replace(/\{fullname\}/g, message.sender)
      .replace(/\{date\}/g, new Date().toLocaleDateString())
      .replace(/\{time\}/g, new Date().toLocaleTimeString());
    
    return personalized;
  }

  public async sendResponse(message: IMessage, responseText: string): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'sendAutomatedResponse',
            messageLink: message.link,
            responseText: responseText
          }, (response: any) => {
            resolve(response && response.success);
          });
        } else {
          resolve(false);
        }
      });
    });
  }

  public async processUnrespondedMessages(): Promise<{ processed: number; success: number }> {
    if (!this.enabled) return { processed: 0, success: 0 };

    return new Promise((resolve) => {
      chrome.storage.local.get(['linkedInMessages', 'categorizedMessages'], async (result: { 
        linkedInMessages?: IMessage[]; 
        categorizedMessages?: { high: string[]; medium: string[]; low: string[] }; 
      }) => {
        const messages: IMessage[] = result.linkedInMessages || [];
        const categorized = result.categorizedMessages || { high: [], medium: [], low: [] };

        let processed = 0;
        let success = 0;

        for (const priority of ['high', 'medium', 'low'] as ('high' | 'medium' | 'low')[]) {
          for (const messageLink of categorized[priority]) {
            const message = messages.find(m => m.link === messageLink);
            
            if (message && !message.responded) {
              processed++;
              
              const sent = await this.processMessage(message);
              if (sent) {
                success++;
                message.responded = true;
              }
            }
          }
        }
        
        chrome.storage.local.set({ 'linkedInMessages': messages });
        resolve({ processed, success });
      });
    });
  }
}

if (typeof module !== 'undefined') {
  module.exports = { MessageAutomation };
}