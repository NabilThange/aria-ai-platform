# Perception Agent Integration into WebAgent

## Overview

WebAgent now integrates PerceptionAgent to analyze browser screenshots and provide richer context to the LLM. This gives the agent a better understanding of the page state beyond just structured element data.

## Architecture

```
WebAgent Execution Loop
│
├─ Iteration 1:
│  ├─ Get PinchTab snapshot (structured data)
│  ├─ (Skip perception - save tokens)
│  ├─ Evaluate success criteria
│  ├─ Build decision prompt
│  └─ LLM decides action
│
├─ Iteration 2:
│  ├─ Get PinchTab snapshot
│  ├─ Capture screenshot via PinchTab
│  ├─ PerceptionAgent analyzes screenshot
│  │  └─ Returns: { active_window, ui_state, clickable_elements, errors_visible, task_relevant_info }
│  ├─ Evaluate success criteria
│  ├─ Build decision prompt WITH perception data
│  └─ LLM decides action (with richer context)
│
├─ Iteration 3:
│  ├─ Get PinchTab snapshot
│  ├─ (Skip perception - save tokens)
│  ├─ Evaluate success criteria
│  ├─ Build decision prompt
│  └─ LLM decides action
│
└─ Iteration 4:
   ├─ Get PinchTab snapshot
   ├─ Capture screenshot via PinchTab
   ├─ PerceptionAgent analyzes screenshot
   ├─ ... (pattern repeats every 2 iterations)
```

## Key Changes

### 1. WebModule Updated
- Added `PerceptionModule` import
- PerceptionAgent is now available to WebAgent

### 2. WebAgent Constructor
- Injected `PerceptionAgent` dependency
- Updated JSDoc to mention perception integration

### 3. New Methods in WebAgent

#### `captureScreenshot(taskId: string): Promise<string | null>`
- Captures a screenshot of the current browser tab via PinchTab
- Returns base64 encoded PNG image
- Gracefully handles failures (returns null)
- Uses PinchTab's `/tabs/{tabId}/screenshot` endpoint

#### `getPagePerception(taskId: string): Promise<any>`
- Calls PerceptionAgent to analyze the screenshot
- Returns structured perception result with:
  - `active_window`: Current window/page title
  - `ui_state`: Description of UI state
  - `clickable_elements`: List of interactive elements
  - `errors_visible`: Boolean indicating errors
  - `task_relevant_info`: Task-relevant information
- Gracefully handles failures (returns null)
- Logs perception analysis results

### 4. Updated buildDecisionPrompt()
- Added `perception?: any` parameter
- Includes perception analysis in decision prompt
- Shows LLM:
  - Active window
  - UI state description
  - Clickable elements
  - Error visibility
  - Task-relevant information

### 5. Updated Execution Loop
- Calls `getPagePerception()` every 2 iterations (to save tokens)
- Passes perception data to `buildDecisionPrompt()`
- Perception is optional - gracefully degrades if unavailable

## Token Optimization

Perception is called every 2 iterations to balance:
- **Rich context**: LLM gets vision-based understanding of page
- **Token efficiency**: Not called every iteration (saves ~3000 tokens per iteration)
- **Cost**: Perception uses Groq Llama 4 Scout (cheaper than main LLM)

## Decision Prompt Enhancement

When perception is available, the LLM sees:

```
👁️ PAGE PERCEPTION ANALYSIS:
- Active Window: Google Search Results
- UI State: Search results page with multiple result links
- Clickable Elements: Search box, result links, pagination controls
- Errors Visible: No
- Task Info: Page contains search results for "India" with multiple links
```

Plus the existing:
- Browser state (instance, tab, URL)
- PinchTab snapshot (element refs, HTML)
- Plan context
- Success criteria

## Benefits

1. **Better Decision Making**: LLM understands page visually, not just structurally
2. **Error Detection**: Perception can identify error messages, dialogs, popups
3. **UI Understanding**: Knows what's clickable, what's visible, what's interactive
4. **Reduced Hallucination**: Vision-based confirmation of page state
5. **Graceful Degradation**: Works without perception if screenshot fails

## Failure Handling

- If screenshot capture fails → Perception skipped, continues with snapshot only
- If PerceptionAgent fails → Logged as warning, continues with snapshot only
- If PinchTab unavailable → Screenshot returns null, perception skipped
- No blocking errors - system always continues

## Performance Impact

- **Token cost**: +~1000 tokens per perception call (every 2 iterations)
- **Time cost**: +~2-3 seconds per perception call (vision model latency)
- **Overall**: Minimal impact due to every-2-iterations frequency
- **Benefit**: Better decision quality, fewer failed actions

## Example Flow

```
Task: "Go to Google and search for India"

Iteration 1:
  - Get snapshot: { url: "about:blank", elements: [...] }
  - No perception (save tokens)
  - LLM: "Navigate to Google"
  - Action: pinchtab_navigate("https://www.google.com")

Iteration 2:
  - Get snapshot: { url: "https://www.google.com", elements: [...] }
  - Capture screenshot
  - PerceptionAgent: "Google homepage with search box visible"
  - LLM sees: "Search box visible, ready to type"
  - LLM: "Type 'India' in search box"
  - Action: pinchtab_type(ref_to_search_box, "India")

Iteration 3:
  - Get snapshot: { url: "https://www.google.com", elements: [...] }
  - No perception (save tokens)
  - LLM: "Press Enter to search"
  - Action: pinchtab_press("Enter")

Iteration 4:
  - Get snapshot: { url: "https://www.google.com/search?q=India", elements: [...] }
  - Capture screenshot
  - PerceptionAgent: "Search results page with multiple result links for India"
  - LLM sees: "Success criteria met - search results visible"
  - Success criteria evaluation: PASS
  - Step completed!
```

## Configuration

No configuration needed. Perception is automatically called every 2 iterations.

To disable perception (if needed):
- Comment out the `getPagePerception()` call in the execution loop
- Or modify the frequency: change `iteration % 2 === 0` to `iteration % 3 === 0` (every 3 iterations)

## Future Enhancements

1. **Adaptive Frequency**: Call perception more often on complex pages, less on simple ones
2. **Perception Caching**: Cache perception results if page hasn't changed
3. **Error-Triggered Perception**: Always call perception if LLM seems confused
4. **Perception Feedback**: Use perception to validate LLM's understanding
5. **Screenshot Comparison**: Compare consecutive screenshots to detect changes
