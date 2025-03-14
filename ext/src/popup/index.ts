// index.ts
import { PopupManager } from "./popup";

document.addEventListener('DOMContentLoaded', async () => {
  const popupManager = new PopupManager();
  await popupManager.init();
});
