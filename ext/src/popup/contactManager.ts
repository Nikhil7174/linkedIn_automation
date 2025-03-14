// ContactsManager.ts
import { UserPreferences } from "../lib/types";
import { UIUtils } from "./uiUtils";

export class ContactsManager {
  public loadImportantContacts(): void {
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

  public addContactToList(contact: string): void {
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
      removeButton.addEventListener('click', (event: MouseEvent) => {
        event.stopPropagation();
        const contactToRemove = removeButton.getAttribute('data-contact');
        if (contactToRemove) {
          chrome.storage.local.get(['userPreferences'], (result: { userPreferences?: UserPreferences }) => {
            const preferences: UserPreferences = result.userPreferences || {};
            if (preferences.importantContacts) {
              preferences.importantContacts = preferences.importantContacts.filter(c => c !== contactToRemove);
              chrome.storage.local.set({ 'userPreferences': preferences }, () => {
                contactItem.remove();
                UIUtils.showStatusMessage('Contact removed successfully!');
                chrome.runtime.sendMessage({
                  action: 'removeImportantContact',
                  contact: contactToRemove
                });
              });
            }
          });
        }
      });
    }
  }

  public addImportantContact(): void {
    const contactInput = document.getElementById('contact-input') as HTMLInputElement | null;
    if (!contactInput) return;
    const contact: string = contactInput.value.trim();
  
    if (contact) {
      chrome.storage.local.get(['userPreferences'], (result: { userPreferences?: UserPreferences }) => {
        const preferences: UserPreferences = result.userPreferences || {};
        if (!preferences.importantContacts) {
          preferences.importantContacts = [];
        }
        if (!preferences.importantContacts.includes(contact)) {
          preferences.importantContacts.push(contact);
          chrome.storage.local.set({ 'userPreferences': preferences }, () => {
            this.addContactToList(contact);
            contactInput.value = '';
            UIUtils.showStatusMessage('Contact added successfully!');
            chrome.runtime.sendMessage({
              action: 'addImportantContact',
              contact: contact
            });
          });
        } else {
          UIUtils.showStatusMessage('Contact already exists!');
        }
      });
    }
  }
}
