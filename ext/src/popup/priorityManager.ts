// PriorityManager.ts
import { UserPreferences } from "../lib/types";
import { UIUtils } from "./uiUtils";

export class PriorityManager {
  public loadPriorityTags(): void {
    chrome.storage.local.get(['userPreferences'], (result: { userPreferences?: UserPreferences }) => {
      if (result.userPreferences && result.userPreferences.priorityTags) {
        const tags: string[] = result.userPreferences.priorityTags;
        const tagsList = document.getElementById('priority-tags-list');
        if (tagsList) {
          tagsList.innerHTML = '';
          tags.forEach((tag: string) => {
            this.addPriorityTagToList(tag);
          });
        }
      }
    });
  }

  public addPriorityTagToList(tag: string): void {
    const tagsList = document.getElementById('priority-tags-list');
    if (!tagsList) return;
  
    const tagItem: HTMLDivElement = document.createElement('div');
    tagItem.className = 'tag-item';
    tagItem.innerHTML = `
      <span class="tag-name">${tag}</span>
      <button class="remove-tag" data-tag="${tag}">×</button>
    `;
    tagsList.appendChild(tagItem);
  
    const removeButton = tagItem.querySelector('.remove-tag') as HTMLButtonElement | null;
    if (removeButton) {
      removeButton.addEventListener('click', (event: MouseEvent) => {
        event.stopPropagation();
        const tagToRemove = removeButton.getAttribute('data-tag');
        if (tagToRemove) {
          chrome.storage.local.get(['userPreferences'], (result: { userPreferences?: UserPreferences }) => {
            const preferences: UserPreferences = result.userPreferences || {};
            if (preferences.priorityTags) {
              preferences.priorityTags = preferences.priorityTags.filter(t => t !== tagToRemove);
              chrome.storage.local.set({ 'userPreferences': preferences }, () => {
                tagItem.remove();
                UIUtils.showStatusMessage('Priority tag removed successfully!');
                chrome.runtime.sendMessage({
                  action: 'removePriorityTag',
                  tag: tagToRemove
                });
              });
            }
          });
        }
      });
    }
  }

  public addPriorityTag(): void {
    const tagInput = document.getElementById('priority-input') as HTMLInputElement | null;
    if (!tagInput) return;
    const tag: string = tagInput.value.trim();
  
    if (tag) {
      chrome.storage.local.get(['userPreferences'], (result: { userPreferences?: UserPreferences }) => {
        const preferences: UserPreferences = result.userPreferences || {};
        if (!preferences.priorityTags) {
          preferences.priorityTags = [];
        }
        if (!preferences.priorityTags.includes(tag)) {
          preferences.priorityTags.push(tag);
          chrome.storage.local.set({ 'userPreferences': preferences }, () => {
            this.addPriorityTagToList(tag);
            tagInput.value = '';
            UIUtils.showStatusMessage('Priority tag added successfully!');
            chrome.runtime.sendMessage({
              action: 'addPriorityTag',
              tag: tag
            });
          });
        } else {
          UIUtils.showStatusMessage('Tag already exists!');
        }
      });
    }
  }
}
