# OpenCode Workflow Examples

The `opencode-request` workflow is a universal coding assistant that can create websites, documents, spreadsheets, and more. Just describe what you want in natural language.

## How It Works

1. **User submits request** - Natural language description of what to build
2. **AI enhances prompt** - Groq analyzes request and adds technical details (libraries, file paths, structure)
3. **OpenCode executes** - Builds the requested output using appropriate tools
4. **Verification** - Lists generated files in /home/user directory
5. **Returns screenshot** - Shows final state

## Example Requests

### 1. PowerPoint Presentations

**User Request:**
> "Create a sales presentation with 5 slides about our Q4 results. Include a title slide, 3 content slides with bullet points, and a conclusion slide. Use blue and white colors."

**What OpenCode Does:**
- Uses `pptxgenjs` library
- Creates `/home/user/Desktop/sales-presentation.pptx`
- Adds 5 slides with specified content
- Applies blue/white color scheme

---

### 2. PDF Reports

**User Request:**
> "Generate a PDF report about AI trends in 2026. Include a title page, 3 sections with headings, and body paragraphs. Save as ai-trends-report.pdf"

**What OpenCode Does:**
- Uses `reportlab` (Python)
- Creates `/home/user/ai-trends-report.pdf`
- Structures content with title, sections, paragraphs
- Applies proper spacing and formatting

---

### 3. Excel Spreadsheets

**User Request:**
> "Make an Excel budget tracker with categories (Housing, Food, Transport, Entertainment) and columns for Jan-Dec. Add formulas to calculate totals. Bold the headers and use a blue background."

**What OpenCode Does:**
- Uses `openpyxl` (Python)
- Creates `/home/user/budget-tracker.xlsx`
- Sets up categories and monthly columns
- Adds SUM formulas
- Applies formatting (bold, colors)

---

### 4. Word Documents

**User Request:**
> "Create a Word document for a project proposal. Include a title 'Project Alpha', executive summary section, 3 main sections with headings, and a conclusion. Use professional formatting."

**What OpenCode Does:**
- Uses `python-docx` or `docx` (Node.js)
- Creates `/home/user/project-proposal.docx`
- Structures with headings and sections
- Applies professional formatting

---

### 5. Websites

**User Request:**
> "Build a landing page for a SaaS product with a hero section, features grid (3 columns), pricing table, and contact form. Use a modern design with gradients and smooth animations."

**What OpenCode Does:**
- Creates HTML/CSS/JS files
- Implements responsive layout (Flexbox/Grid)
- Adds design system (spacing, colors, typography)
- Includes animations and hover effects
- Ensures accessibility (semantic HTML, ARIA)

---

### 6. Multiple Outputs

**User Request:**
> "Create a presentation about our product AND a PDF one-pager summary. The presentation should have 8 slides, the PDF should be 1 page with key points."

**What OpenCode Does:**
- Generates both files in sequence
- `/home/user/product-presentation.pptx` (8 slides)
- `/home/user/product-summary.pdf` (1 page)
- Returns list of both files created

---

## Workflow Variables

```typescript
{
  userRequest: string  // Natural language description of what to build
}
```

## Workflow Output

```typescript
{
  success: boolean,
  message: string,
  data: {
    userRequest: string,           // Original request
    improvedPrompt: string,        // AI-enhanced prompt (raw)
    cleanPrompt: string,           // Sanitized prompt sent to OpenCode
    promptLength: number,          // Character count
    generatedFiles: string,        // ls output showing created files
    finalScreenshot: string        // Base64 screenshot
  }
}
```

## Tips for Best Results

### Be Specific About Output Type
✅ "Create a PowerPoint presentation..."  
✅ "Generate a PDF report..."  
✅ "Make an Excel spreadsheet..."  
❌ "Create a document..." (ambiguous)

### Include Content Details
✅ "5 slides with bullet points about Q4 sales"  
❌ "Make a presentation" (too vague)

### Specify File Names
✅ "Save as sales-report.pdf"  
✅ "Name it budget-2026.xlsx"  
⚠️ If not specified, OpenCode chooses a name

### Mention Visual Style
✅ "Use blue and white colors"  
✅ "Modern design with gradients"  
✅ "Professional formatting with bold headers"

### Request Multiple Outputs
✅ "Create a presentation AND a PDF summary"  
✅ "Make an Excel file and a Word report"

## Common Use Cases

### Business Documents
- Sales presentations
- Financial reports (PDF)
- Budget spreadsheets
- Project proposals (Word)
- Invoice templates

### Marketing Materials
- Landing pages
- Product one-pagers (PDF)
- Pitch decks (PowerPoint)
- Email templates (HTML)

### Data & Analysis
- Data visualization dashboards
- Excel reports with charts
- CSV to formatted Excel conversion
- PDF reports with tables

### Development
- HTML/CSS/JS prototypes
- React components
- Python scripts
- Node.js utilities

## Troubleshooting

### "No files found" in output
- OpenCode may still be running (increase wait time)
- Check if command succeeded (look at screenshot)
- File might be in different directory

### OpenCode didn't launch
- Check if installed: `docker exec aria-desktop which opencode`
- Reinstall: `docker exec aria-desktop npm install -g opencode-ai`

### Wrong output type
- Be more specific in request ("PowerPoint" not "slides")
- Mention library explicitly ("using pptxgenjs")

## Integration with Other Workflows

### Chaining Workflows
1. **google-search** → gather data
2. **opencode-request** → create presentation with data
3. **send-email-n8n** → email the presentation

### Example Task
> "Search for Q4 sales data, create a PowerPoint presentation with the results, and email it to the team"

**Orchestrator Plan:**
```
Step 1: google-search (query: "Q4 sales data 2026")
Step 2: opencode-request (userRequest: "Create a PowerPoint with Q4 sales data: [results from step 1]")
Step 3: send-email-n8n (attachment: /home/user/sales-presentation.pptx)
```

## Advanced Examples

### Dynamic Data in Documents
> "Create an Excel file with the top 10 Python libraries from PyPI. Include columns for name, downloads, and description. Add a chart showing download counts."

### Multi-Format Output
> "Generate a comprehensive report: 1) PowerPoint presentation (10 slides), 2) PDF executive summary (2 pages), 3) Excel data sheet with raw numbers"

### Interactive Websites
> "Build a calculator web app with a clean UI. Include buttons for numbers and operations, a display screen, and keyboard support. Use CSS Grid for layout."

## File Locations

All generated files are saved to `/home/user/` by default:
- `/home/user/presentation.pptx`
- `/home/user/report.pdf`
- `/home/user/data.xlsx`
- `/home/user/document.docx`
- `/home/user/index.html`

You can specify subdirectories:
- `/home/user/reports/monthly-report.pdf`
- `/home/user/presentations/sales-deck.pptx`
