import { CategorizedMessages, UserPreferences, AutomationSettings } from "../lib/types";
import './styles/style.css';
  
  document.addEventListener('DOMContentLoaded', (): void => {
    loadMessageStats();
    loadImportantContacts();
    loadAutomationSettings();
  
    document.getElementById('add-contact')?.addEventListener('click', addImportantContact);
    document.getElementById('refresh-messages')?.addEventListener('click', refreshMessages);
    document.getElementById('open-linkedin')?.addEventListener('click', openLinkedInMessages);
    document.getElementById('automation-toggle')?.addEventListener('change', toggleAutomation);
    document.getElementById('save-templates')?.addEventListener('click', saveTemplates);
  });
  
  // Function to load message statistics
  export const loadMessageStats = (): void => {
    chrome.storage.local.get(['categorizedMessages', 'linkedInMessages'], function(result: { categorizedMessages?: CategorizedMessages; linkedInMessages?: any[] }): void {
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
  
  // Function to load important contacts
  export const loadImportantContacts = (): void => {
    chrome.storage.local.get(['userPreferences'], function(result: { userPreferences?: UserPreferences }): void {
      if (result.userPreferences && result.userPreferences.importantContacts) {
        const contacts: string[] = result.userPreferences.importantContacts;
        const contactsList = document.getElementById('contacts-list');
        if (contactsList) {
          contactsList.innerHTML = '';
  
          contacts.forEach((contact: string) => {
            addContactToList(contact);
          });
        }
      }
    });
  }
  
  // Function to add a contact to the displayed list
  export const addContactToList = (contact: string): void => {
    const contactsList = document.getElementById('contacts-list');
    if (!contactsList) return;
    
    const contactItem: HTMLDivElement = document.createElement('div');
    contactItem.className = 'contact-item';
  
    contactItem.innerHTML = `
      <span class="contact-name">${contact}</span>
      <button class="remove-contact" data-contact="${contact}">×</button>
    `;
  
    contactsList.appendChild(contactItem);
  
    // Add event listener to remove button
    const removeButton = contactItem.querySelector('.remove-contact') as HTMLButtonElement | null;
    if (removeButton) {
      removeButton.addEventListener('click', function(this: HTMLButtonElement): void {
        const contactToRemove = this.getAttribute('data-contact');
        if (contactToRemove) {
          removeImportantContact(contactToRemove);
        }
      });
    }
  }
  
  // Function to add an important contact
  export const addImportantContact = (): void => {
    const contactInput = document.getElementById('contact-input') as HTMLInputElement | null;
    if (!contactInput) return;
    const contact: string = contactInput.value.trim();
  
    if (contact) {
      // Send message to background script
      chrome.runtime.sendMessage(
        {
          action: 'addImportantContact',
          contact: contact
        },
        function(response: { success: boolean }): void {
          if (response && response.success) {
            addContactToList(contact);
            contactInput.value = '';
          }
        }
      );
    }
  }
  
  // Function to remove an important contact
  export const removeImportantContact = (contact: string): void => {
    chrome.runtime.sendMessage(
      {
        action: 'removeImportantContact',
        contact: contact
      },
      function(response: { success: boolean }): void {
        if (response && response.success) {
          loadImportantContacts();
        }
      }
    );
  }
  
  // Function to refresh messages
  export const refreshMessages = (): void => {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs: chrome.tabs.Tab[]): void {
      if (tabs.length > 0 && tabs[0].id !== undefined) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'refreshMessages' });
      }
    });
  }
  
  // Function to open LinkedIn messages
  export const openLinkedInMessages = (): void => {
    chrome.tabs.create({ url: 'https://www.linkedin.com/messaging/' });
  }
  
  // Function to load automation settings
  export const loadAutomationSettings = (): void => {
    chrome.storage.local.get(['userPreferences'], function(result: { userPreferences?: UserPreferences }): void {
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
  
  // Function to toggle automation settings visibility
  const toggleAutomation = (): void => {
    const automationToggle = document.getElementById('automation-toggle') as HTMLInputElement | null;
    const automationSettingsElem = document.getElementById('automation-settings');
    
    if (!automationToggle || !automationSettingsElem) return;
    
    const enabled: boolean = automationToggle.checked;
    automationSettingsElem.classList.toggle('hidden', !enabled);
    
    // Save automation state
    chrome.storage.local.get(['userPreferences'], function(result: { userPreferences?: UserPreferences }): void {
      const preferences: UserPreferences = result.userPreferences || {};
  
      if (!preferences.automationSettings) {
        preferences.automationSettings = { enabled: false };
      }
  
      preferences.automationSettings.enabled = enabled;
  
      chrome.storage.local.set({ 'userPreferences': preferences });
    });
  }
  
  // Function to save response templates
  const saveTemplates = (): void => {
    const highTemplateElem = document.getElementById('high-template') as HTMLTextAreaElement | null;
    const mediumTemplateElem = document.getElementById('medium-template') as HTMLTextAreaElement | null;
    const lowTemplateElem = document.getElementById('low-template') as HTMLTextAreaElement | null;
    
    if (!highTemplateElem || !mediumTemplateElem || !lowTemplateElem) return;
    
    const highTemplate: string = highTemplateElem.value;
    const mediumTemplate: string = mediumTemplateElem.value;
    const lowTemplate: string = lowTemplateElem.value;
    
    chrome.storage.local.get(['userPreferences'], function(result: { userPreferences?: UserPreferences }): void {
      const preferences: UserPreferences = result.userPreferences || {};
  
      if (!preferences.automationSettings) {
        preferences.automationSettings = { enabled: false };
      }
  
      preferences.automationSettings.templates = {
        high: highTemplate,
        medium: mediumTemplate,
        low: lowTemplate
      };
  
      chrome.storage.local.set({ 'userPreferences': preferences }, function(): void {
        showStatusMessage('Templates saved successfully!');
      });
    });
  }
  
  // Function to show status message
  const showStatusMessage = (message: string): void => {
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
  