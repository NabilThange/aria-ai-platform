import { Injectable, Logger } from '@nestjs/common';

export interface Coordinates {
  x: number;
  y: number;
}

export interface ScreenshotResult {
  image: string;
  width: number;
  height: number;
}

export interface FileResult {
  path: string;
  content?: string;
  success: boolean;
}

@Injectable()
export class DesktopService {
  private readonly logger = new Logger(DesktopService.name);
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.ARIA_DESKTOP_BASE_URL || 'http://localhost:9990';
    this.logger.log(`Desktop base URL: ${this.baseUrl}`);
  }

  private async request(
    method: 'GET' | 'POST',
    path: string,
    data?: any,
    retries: number = 3,
    timeoutMs: number = 10000,
  ): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.logger.debug(`Request attempt ${attempt}/${retries}: ${method} ${url} (timeout: ${timeoutMs}ms)`);
        const response = await fetch(url, options);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        const raw = await response.text();
        return raw ? JSON.parse(raw) : {};
      } catch (error) {
        lastError = error;
        this.logger.warn(`Request failed (attempt ${attempt}/${retries}): ${error.message}`);
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          this.logger.debug(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Desktop request failed after ${retries} attempts to ${url}: ${lastError?.message || 'Unknown error'}`);
  }

  // ========================================
  // MOUSE ACTIONS
  // ========================================

  async moveMouse(x: number, y: number): Promise<void> {
    await this.request('POST', '/computer-use', { action: 'move_mouse', coordinates: { x, y } });
  }

  async traceMouse(path: Coordinates[], holdKeys?: string[]): Promise<void> {
    await this.request('POST', '/computer-use', { action: 'trace_mouse', path, holdKeys });
  }

  async clickMouse(
    coordinates?: Coordinates,
    button: 'left' | 'right' | 'middle' = 'left',
    clickCount: number = 1,
    holdKeys?: string[],
  ): Promise<void> {
    await this.request('POST', '/computer-use', { action: 'click_mouse', coordinates, button, clickCount, holdKeys });
  }

  async pressMouse(press: 'up' | 'down', button: 'left' | 'right' | 'middle' = 'left', coordinates?: Coordinates): Promise<void> {
    await this.request('POST', '/computer-use', { action: 'press_mouse', press, button, coordinates });
  }

  async dragMouse(start: Coordinates, end: Coordinates, button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    await this.request('POST', '/computer-use', { action: 'drag_mouse', start, end, button });
  }

  // ========================================
  // KEYBOARD ACTIONS
  // ========================================

  async typeText(text: string, delay?: number): Promise<void> {
    // Calculate timeout: base 15s + (text length * delay * 2 for safety) + 5s buffer
    // The *2 multiplier accounts for system overhead and ensures we don't timeout during typing
    const estimatedTime = text.length * (delay || 0) * 2;
    const timeoutMs = Math.max(15000, estimatedTime + 5000);
    
    await this.request('POST', '/computer-use', { action: 'type_text', text, delay }, 3, timeoutMs);
  }

  async pressKeys(keys: string[]): Promise<void> {
    await this.request('POST', '/computer-use', { action: 'type_keys', keys });
  }

  async typeKeys(keys: string[]): Promise<void> {
    await this.request('POST', '/computer-use', { action: 'type_keys', keys });
  }

  async pasteText(text: string): Promise<void> {
    await this.request('POST', '/computer-use', { action: 'paste_text', text });
  }

  // ========================================
  // SYSTEM ACTIONS
  // ========================================

  async screenshot(): Promise<ScreenshotResult> {
    return await this.request('POST', '/computer-use', { action: 'screenshot' });
  }

  async getCursorPosition(): Promise<Coordinates> {
    return await this.request('POST', '/computer-use', { action: 'cursor_position' });
  }

  async launchApplication(
    application: 'chromium' | 'gmail' | 'vscode' | 'terminal' | 'thunar' | 'mousepad' | 'desktop',
  ): Promise<void> {
    await this.request('POST', '/computer-use', { action: 'application', application });
  }

  async scroll(direction: 'up' | 'down', amount: number = 3): Promise<void> {
    await this.request('POST', '/computer-use', { action: 'scroll', direction, scrollCount: amount });
  }

  // wait is just a local timer — no API call needed
  async wait(duration: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  // ========================================
  // FILE OPERATIONS
  // ========================================

  // ✅ FIX: API expects "data" not "content"
  async writeFile(path: string, content: string): Promise<FileResult> {
    return await this.request('POST', '/computer-use', {
      action: 'write_file',
      path,
      data: content, // ✅ correct field name
    });
  }

  async readFile(path: string): Promise<FileResult> {
    return await this.request('POST', '/computer-use', {
      action: 'read_file',
      path,
    });
  }

  // ========================================
  // CONVENIENCE METHODS
  // ========================================

  async click(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    await this.clickMouse({ x, y }, button);
  }

  async doubleClick(x: number, y: number): Promise<void> {
    await this.clickMouse({ x, y }, 'left', 2);
  }

  async rightClick(x: number, y: number): Promise<void> {
    await this.clickMouse({ x, y }, 'right');
  }

  async typeAndEnter(text: string): Promise<void> {
    await this.pasteText(text);
    await this.pressKeys(['Return']);
  }

  async shortcut(...keys: string[]): Promise<void> {
    await this.request('POST', '/computer-use', { action: 'type_keys', keys });
  }
}