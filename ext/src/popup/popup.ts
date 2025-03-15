import { ContactsManager } from "./contactManager";
import { PriorityManager } from "./priorityManager";
import { AutomationManager } from "./automationManager";
import { StatsManager } from "./statsManager";
import { MessageAutomation } from "../util/automation";
import './styles/style.css';

export class PopupManager {
  private contactsManager: ContactsManager;
  private priorityManager: PriorityManager;
  private automationManager: AutomationManager;
  private statsManager: StatsManager;
  private automation: MessageAutomation;
  private isSorted: boolean = false;
  private messageCount: number = 0;

  constructor() {
    this.automation = new MessageAutomation();
    this.contactsManager = new ContactsManager();
    this.priorityManager = new PriorityManager();
    this.automationManager = new AutomationManager(this.automation);
    this.statsManager = new StatsManager();
  }

  public async init(): Promise<void> {
    await this.automation.init();

    // Load saved data into the UI
    this.statsManager.loadMessageStats();
    this.contactsManager.loadImportantContacts();
    this.priorityManager.loadPriorityTags();
    this.automationManager.loadAutomationSettings();
    
    // Get current state from content script
    this.getCurrentState();
    
    // Listen for state updates from content script
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'stateUpdate') {
        this.updateSortButtonState(message.data.isSorted, message.data.messageCount);
      }
    });

    this.attachEventListeners();
  }

  private getCurrentState(): void {
    // Query active LinkedIn tabs for their state
    chrome.tabs.query({ url: '*://*.linkedin.com/messaging/*' }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id!, { action: 'getState' }, (response) => {
          if (response) {
            this.updateSortButtonState(response.isSorted, response.messageCount);
          }
        });
      }
    });
  }

  private updateSortButtonState(isSorted: boolean, messageCount: number): void {
    this.isSorted = isSorted;
    this.messageCount = messageCount;
    
    const sortButton = document.getElementById('rule-sort') as HTMLButtonElement;
    const sortStatus = document.getElementById('sort-status') as HTMLElement;
    
    if (sortButton) {
      sortButton.textContent = isSorted ? 'Reset Order' : 'Sort Messages';
    }
    
    if (sortStatus) {
      sortStatus.textContent = isSorted ? `${messageCount} messages sorted by priority` : '';
    }
  }

  private toggleSort(): void {
    chrome.tabs.query({ url: '*://*.linkedin.com/messaging/*' }, (tabs) => {
      if (tabs.length > 0 && tabs[0].id) {
        if (this.isSorted) {
          // If sorted, reset by reloading the LinkedIn messaging page
          chrome.tabs.reload(tabs[0].id);
        } else {
          // If not sorted, send a message to toggle sort
          chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleSort' }, (response) => {
            if (response) {
              this.updateSortButtonState(response.isSorted, this.messageCount);
            }
          });
        }
      } else {
        alert('Please open the LinkedIn messaging page to sort messages.');
      }
    });
  }
  private toggleSpamDetection(): void {
    chrome.tabs.query({ url: '*://*.linkedin.com/messaging/*' }, (tabs) => {
      if (tabs.length > 0 && tabs[0].id) {
        // Send a message to content script to detect spam messages
        chrome.tabs.sendMessage(tabs[0].id, { action: 'detectSpam' }, (response) => {
          console.log("Spam detection triggered", response);
        });
      } else {
        alert('Please open the LinkedIn messaging page to detect spam messages.');
      }
    });
  }

  private attachEventListeners(): void {
    document.getElementById('add-contact')?.addEventListener('click', () => this.contactsManager.addImportantContact());
    document.getElementById('add-priority')?.addEventListener('click', () => this.priorityManager.addPriorityTag());
    document.getElementById('refresh-messages')?.addEventListener('click', () => this.statsManager.refreshMessages());
    document.getElementById('open-linkedin')?.addEventListener('click', () => this.statsManager.openLinkedInMessages());
    document.getElementById('automation-toggle')?.addEventListener('change', () => this.automationManager.toggleAutomation());
    // Add event listener for the sort button
    document.getElementById('rule-sort')?.addEventListener('click', () => this.toggleSort());
    document.getElementById('ai-sort')?.addEventListener('click', () => {
      chrome.tabs.query({ url: '*://*.linkedin.com/messaging/*' }, (tabs) => {
        if (tabs.length > 0 && tabs[0].id) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: 'analyzeMessages', method: 'ai' },
            (response) => {
              console.log("AI-Based Sorting Triggered", response);
            }
          );
        } else {
          alert('Please open the LinkedIn messaging page to sort messages.');
        }
      });
    });
    document.getElementById('spam-toggle')?.addEventListener('change', () => {
      chrome.tabs.query({ url: "*://*.linkedin.com/messaging/*" }, (tabs) => {
        if (tabs.length > 0 && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "toggleSpamDetection" }, (response) => {
            console.log("Spam detection toggled", response);
          });
        }
      });
    });
  }
}