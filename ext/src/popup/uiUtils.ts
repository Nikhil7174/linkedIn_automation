export class UIUtils {
    public static showStatusMessage(message: string): void {
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
  