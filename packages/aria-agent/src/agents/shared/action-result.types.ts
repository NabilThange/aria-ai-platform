/**
 * Web/Desktop Agent Output Schema
 * Section 9.10 of architecture document
 * Shared by both WebAgent and DesktopAgent
 */

export interface ActionResult {
  action: string;             // what was done: "clicked login button"
  details: any;               // agent-specific details
  screenshot?: string;        // base64, desktop only
  url?: string;               // current URL, web only
  elements?: string[];        // PinchTab element refs, web only
  error?: string;             // if something went wrong
  timestamp: string;          // ISO 8601
}
