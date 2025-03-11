import { 
  CategorizedMessages, 
  UserPreferences, 
  AutomationSettings, 
  IAutomatedResponseResult, 
  IAutomationRequest 
} from "../lib/types";
import './styles/style.css';

import { MessageAutomation } from "../content/automation";

export class PopupManager {
  private automation: MessageAutomation;

  constructor() {
    this.automation = new MessageAutomation();
  }

  public async init(): Promise<void> {
    await this.automation.init();

    this.loadMessageStats();
    this.loadImportantContacts();
    this.loadAutomationSettings();
    
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    document.getElementById('add-contact')?.addEventListener('click', () => this.addImportantContact());
    document.getElementById('refresh-messages')?.addEventListener('click', () => this.refreshMessages());
    document.getElementById('open-linkedin')?.addEventListener('click', () => this.openLinkedInMessages());
    document.getElementById('automation-toggle')?.addEventListener('change', () => this.toggleAutomation());
    document.getElementById('save-templates')?.addEventListener('click', () => this.saveTemplates());
    
    const processButton = document.createElement('button');
    processButton.id = 'process-messages';
    processButton.className = 'secondary-button';
    processButton.textContent = 'Process Unresponded Messages';
    processButton.addEventListener('click', () => this.processUnrespondedMessages());
    
    const automationSettingsElem = document.querySelector('.automation-settings');
    if (automationSettingsElem) {
      automationSettingsElem.appendChild(processButton);
    }
  }

  private async processUnrespondedMessages(): Promise<void> {
    if (!this.automation.isEnabled()) {
      this.showStatusMessage('Automation is not enabled!');
      return;
    }
    
    const processButton = document.getElementById('process-messages') as HTMLButtonElement | null;
    if (processButton) {
      processButton.disabled = true;
      processButton.textContent = 'Processing...';
    }
    
    try {
      const result = await this.automation.processUnrespondedMessages();
      this.showStatusMessage(`Processed ${result.processed} messages, ${result.success} sent successfully`);
    } catch (error) {
      this.showStatusMessage('Error processing messages');
      console.error(error);
    } finally {
      if (processButton) {
        processButton.disabled = false;
        processButton.textContent = 'Process Unresponded Messages';
      }
    }
  }

  private toggleAutomation(): void {
    const automationToggle = document.getElementById('automation-toggle') as HTMLInputElement | null;
    const automationSettingsElem = document.getElementById('automation-settings');
    
    if (!automationToggle || !automationSettingsElem) return;
    
    const enabled: boolean = automationToggle.checked;
    automationSettingsElem.classList.toggle('hidden', !enabled);
    
    this.automation.enabled = enabled;
    
    chrome.storage.local.get(['userPreferences'], (result: { userPreferences?: UserPreferences }) => {
      const preferences: UserPreferences = result.userPreferences || {};
  
      if (!preferences.automationSettings) {
        preferences.automationSettings = { enabled: false };
      }
  
      preferences.automationSettings.enabled = enabled;
  
      chrome.storage.local.set({ 'userPreferences': preferences });
    });
  }

  private loadMessageStats(): void {
    chrome.storage.local.get(['categorizedMessages', 'linkedInMessages'], (result: { 
      categorizedMessages?: CategorizedMessages; 
      linkedInMessages?: any[] 
    }) => {
      const categorized: CategorizedMessages = result.categorizedMessages || { high: [], medium: [], low: [] };
      const totalMessages: number = result.linkedInMessages ? result.linkedInMessages.length : 0;
  
      const highCountElem = document.getElementById('high-count');
      const mediumCountElem = document.getElementById('medium-count');
      const lowCountElem = document.getElementById('low-count');
      const totalCountElem = document.getElementById('total-count');
  
      if (highCountElem) highCountElem.textContent = String(categorized.high.length);
      if (mediumCountElem) mediumCountElem.textContent = String(categorized.medium.length);
      if (lowCountElem) lowCountElem.textContent = String(categorized.low.length);
      if (totalCountElem) totalCountElem.textContent = String(totalMessages);
    });
  }

  private loadImportantContacts(): void {
    chrome.storage.local.get(['userPreferences'], (result: { userPreferences?: UserPreferences }) => {
      if (result.userPreferences && result.userPreferences.importantContacts) {
        const contacts: string[] = result.userPreferences.importantContacts;
        const contactsList = document.getElementById('contacts-list');
        if (contactsList) {
          contactsList.innerHTML = '';
  
          contacts.forEach((contact: string) => {
            this.addContactToList(contact);
          });
        }
      }
    });
  }

  private addContactToList(contact: string): void {
    const contactsList = document.getElementById('contacts-list');
    if (!contactsList) return;
    
    const contactItem: HTMLDivElement = document.createElement('div');
    contactItem.className = 'contact-item';
  
    contactItem.innerHTML = `
      <span class="contact-name">${contact}</span>
      <button class="remove-contact" data-contact="${contact}">×</button>
    `;
  
    contactsList.appendChild(contactItem);
  
    const removeButton = contactItem.querySelector('.remove-contact') as HTMLButtonElement | null;
    if (removeButton) {
      removeButton.addEventListener('click', function(this: HTMLButtonElement): void {
        const contactToRemove = this.getAttribute('data-contact');
        if (contactToRemove) {
          chrome.runtime.sendMessage(
            {
              action: 'removeImportantContact',
              contact: contactToRemove
            },
            function(response: { success: boolean }): void {
              if (response && response.success) {
                const popupManager = new PopupManager();
                popupManager.loadImportantContacts();
              }
            }
          );
        }
      });
    }
  }

  private addImportantContact(): void {
    const contactInput = document.getElementById('contact-input') as HTMLInputElement | null;
    if (!contactInput) return;
    const contact: string = contactInput.value.trim();
  
    if (contact) {
      chrome.runtime.sendMessage(
        {
          action: 'addImportantContact',
          contact: contact
        },
        (response: { success: boolean }) => {
          if (response && response.success) {
            this.addContactToList(contact);
            contactInput.value = '';
          }
        }
      );
    }
  }

  private refreshMessages(): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
      if (tabs.length > 0 && tabs[0].id !== undefined) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'refreshMessages' });
      }
    });
  }

  private openLinkedInMessages(): void {
    chrome.tabs.create({ url: 'https://www.linkedin.com/messaging/' });
  }

  private loadAutomationSettings(): void {
    chrome.storage.local.get(['userPreferences'], (result: { userPreferences?: UserPreferences }) => {
      if (result.userPreferences && result.userPreferences.automationSettings) {
        const settings: AutomationSettings = result.userPreferences.automationSettings;
        const automationToggle = document.getElementById('automation-toggle') as HTMLInputElement | null;
        const automationSettingsElem = document.getElementById('automation-settings');
        
        if (automationToggle && automationSettingsElem) {
          automationToggle.checked = settings.enabled;
          automationSettingsElem.classList.toggle('hidden', !settings.enabled);
        }
  
        if (settings.templates) {
          const highTemplateElem = document.getElementById('high-template') as HTMLTextAreaElement | null;
          const mediumTemplateElem = document.getElementById('medium-template') as HTMLTextAreaElement | null;
          const lowTemplateElem = document.getElementById('low-template') as HTMLTextAreaElement | null;
          
          if (highTemplateElem) highTemplateElem.value = settings.templates.high || '';
          if (mediumTemplateElem) mediumTemplateElem.value = settings.templates.medium || '';
          if (lowTemplateElem) lowTemplateElem.value = settings.templates.low || '';
        }
      }
    });
  }

  private saveTemplates(): void {
    const highTemplateElem = document.getElementById('high-template') as HTMLTextAreaElement | null;
    const mediumTemplateElem = document.getElementById('medium-template') as HTMLTextAreaElement | null;
    const lowTemplateElem = document.getElementById('low-template') as HTMLTextAreaElement | null;
  
    const highTemplate = highTemplateElem ? highTemplateElem.value : '';
    const mediumTemplate = mediumTemplateElem ? mediumTemplateElem.value : '';
    const lowTemplate = lowTemplateElem ? lowTemplateElem.value : '';
    
    this.automation.setTemplates({
      high: highTemplate,
      medium: mediumTemplate,
      low: lowTemplate
    });
    
    chrome.storage.local.get(['userPreferences'], (result) => {
      const preferences = result.userPreferences || {};
      
      if (!preferences.automationSettings) {
        preferences.automationSettings = {};
      }
      
      preferences.automationSettings.templates = {
        high: highTemplate,
        medium: mediumTemplate,
        low: lowTemplate
      };
      
      chrome.storage.local.set({'userPreferences': preferences}, () => {
        this.showStatusMessage('Templates saved successfully!');
      });
    });
  }

  private showStatusMessage(message: string): void {
    const statusDiv: HTMLDivElement = document.createElement('div');
    statusDiv.className = 'status-message';
    statusDiv.textContent = message;
  
    document.body.appendChild(statusDiv);
  
    setTimeout((): void => {
      statusDiv.classList.add('show');
    }, 10);
  
    setTimeout((): void => {
      statusDiv.classList.remove('show');
      setTimeout((): void => {
        statusDiv.parentNode?.removeChild(statusDiv);
      }, 300);
    }, 2000);
  }
}

export class MessageSender {

  public static async sendAutomatedResponse(
    messageLink: string,
    responseText: string
  ): Promise<IAutomatedResponseResult> {
    console.log('Attempting to send automated response');
    
    try {
      if (messageLink) {
        if (window.location.href.includes('messaging')) {
          const conversationElement = document.querySelector<HTMLAnchorElement>(`a[href="${messageLink}"]`);
          if (conversationElement) {
            conversationElement.click();
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        } else {
          window.location.href = messageLink;
          await new Promise(resolve => setTimeout(resolve, 2000));
          return { success: false, reason: 'navigation_required' };
        }
      }
      
      const messageInput = document.querySelector<HTMLDivElement>('.msg-form__contenteditable');
      if (!messageInput) {
        console.error('Message input not found');
        return { success: false, reason: 'input_not_found' };
      }
      
      messageInput.focus();
      document.execCommand('insertText', false, responseText);
      
      if (!messageInput.textContent) {
        messageInput.textContent = responseText;
        messageInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      const sendButton = document.querySelector<HTMLButtonElement>('button.msg-form__send-button');
      if (!sendButton) {
        console.error('Send button not found');
        return { success: false, reason: 'send_button_not_found' };
      }
      
      if (!sendButton.disabled) {
        sendButton.click();
        console.log('Message sent successfully');
        return { success: true };
      } else {
        console.error('Send button is disabled');
        return { success: false, reason: 'send_button_disabled' };
      }
      
    } catch (error: any) {
      console.error('Error sending automated response:', error);
      return { success: false, reason: 'exception', error: error.message };
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const popupManager = new PopupManager();
  await popupManager.init();
});

chrome.runtime.onMessage.addListener((request: IAutomationRequest, sender, sendResponse) => {
  if (request.action === 'sendAutomatedResponse') {
    MessageSender.sendAutomatedResponse(request.messageLink || '', request.responseText || '')
      .then(result => sendResponse(result))
      .catch(error =>
        sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) })
      );
    return true; // Keep the message channel open for the async response
  }
  
  if (request.action === 'refreshMessages') {
    // Assume extractMessages is defined elsewhere in your content script
    // if (typeof extractMessages === 'function') {
    //   extractMessages();
    // }
    sendResponse({ success: true });
  }
});