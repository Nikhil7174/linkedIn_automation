// popupManager.ts
import { ContactsManager } from "./contactManager";
import { PriorityManager } from "./priorityManager";
import { AutomationManager } from "./automationManager";
import { StatsManager } from "./statsManager";
import { MessageAutomation } from "../content/automation";
import './styles/style.css';

export class PopupManager {
  private contactsManager: ContactsManager;
  private priorityManager: PriorityManager;
  private automationManager: AutomationManager;
  private statsManager: StatsManager;
  private automation: MessageAutomation;

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
    
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    document.getElementById('add-contact')?.addEventListener('click', () => this.contactsManager.addImportantContact());
    document.getElementById('add-priority')?.addEventListener('click', () => this.priorityManager.addPriorityTag());
    document.getElementById('refresh-messages')?.addEventListener('click', () => this.statsManager.refreshMessages());
    document.getElementById('open-linkedin')?.addEventListener('click', () => this.statsManager.openLinkedInMessages());
    document.getElementById('automation-toggle')?.addEventListener('change', () => this.automationManager.toggleAutomation());
    document.getElementById('save-templates')?.addEventListener('click', () => this.automationManager.saveTemplates());
  }
}
