import { CategorizedMessages, UserPreferences, AutomationSettings } from "../lib/types";

  
  document.addEventListener('DOMContentLoaded', (): void => {
    loadMessageStats();
    loadImportantContacts();
    loadAutomationSettings();
  
    document.getElementById('refresh-messages')?.addEventListener('click', refreshMessages);
    document.getElementById('open-linkedin')?.addEventListener('click', openLinkedInMessages);
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

  // Function to remove an important contact
  export const removeImportantContact = (contact: string): void => {
    chrome.runtime.sendMessage(
      {
        action: 'removeImportantContact',
        contact: contact
      },
      function(response: { success: boolean }): void {
        if (response && response.success) {
          loadImportantContacts(); // Reload the contacts list
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
          // Set toggle state
          automationToggle.checked = settings.enabled;
          // Show/hide settings based on toggle
          automationSettingsElem.classList.toggle('hidden', !settings.enabled);
        }
  
        // Load templates if available
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