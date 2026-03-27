# Document Generation Guide

## Overview

The ARIA desktop environment includes comprehensive document generation capabilities. AI agents can create PowerPoint presentations, Word documents, PDFs, and Excel spreadsheets programmatically without any GUI interaction.

## Installed Libraries

### Node.js Libraries (Global)
```bash
npm list -g --depth=0
# pptxgenjs - PowerPoint generation
# docx - Word document generation
# opencode-ai - AI coding assistant
```

### Python Libraries
```bash
pip3 list
# reportlab - PDF generation
# openpyxl - Excel spreadsheet manipulation
# python-docx - Word document generation (alternative)
```

## Quick Start Examples

### 1. Create PowerPoint (.pptx)

**Using pptxgenjs (Node.js):**
```javascript
const pptxgen = require('pptxgenjs');
const pres = new pptxgen();

// Add title slide
const slide1 = pres.addSlide();
slide1.addText('Welcome to ARIA', { 
  x: 1, y: 1, fontSize: 44, bold: true, color: '363636' 
});

// Add content slide
const slide2 = pres.addSlide();
slide2.addText('Key Features', { x: 1, y: 0.5, fontSize: 32, bold: true });
slide2.addText([
  { text: '• AI-powered automation', options: { fontSize: 18 } },
  { text: '• Multi-agent orchestration', options: { fontSize: 18 } },
  { text: '• Document generation', options: { fontSize: 18 } }
], { x: 1, y: 1.5 });

// Save
pres.writeFile({ fileName: '/home/user/presentation.pptx' });
```

**Agent Prompt:**
> "Install pptxgenjs and create a 5-slide presentation about AI automation. Include a title slide, 3 content slides with bullet points, and a conclusion slide. Use a professional color scheme with blue headers. Save to /home/user/output.pptx"

### 2. Create Word Document (.docx)

**Using docx (Node.js):**
```javascript
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const fs = require('fs');

const doc = new Document({
  sections: [{
    properties: {},
    children: [
      new Paragraph({
        text: 'Project Report',
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Executive Summary: ', bold: true }),
          new TextRun('This report covers the implementation of ARIA...'),
        ],
      }),
    ],
  }],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/home/user/report.docx', buffer);
});
```

**Agent Prompt:**
> "Create a Word document with the docx library. Include a title 'Monthly Report', 3 sections with headings, bullet lists, and bold text for emphasis. Save to /home/user/report.docx"

### 3. Create PDF (.pdf)

**Using reportlab (Python):**
```python
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

doc = SimpleDocTemplate('/home/user/output.pdf', pagesize=letter)
styles = getSampleStyleSheet()
story = []

# Add title
story.append(Paragraph('ARIA System Report', styles['Title']))
story.append(Spacer(1, 12))

# Add content
story.append(Paragraph('Introduction', styles['Heading1']))
story.append(Paragraph('This document describes the ARIA platform...', styles['BodyText']))

doc.build(story)
```

**Agent Prompt:**
> "Install reportlab and create a PDF report with a title, 3 sections with headings, and body paragraphs. Use proper spacing and formatting. Save to /home/user/report.pdf"

### 4. Create Excel Spreadsheet (.xlsx)

**Using openpyxl (Python):**
```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill

wb = Workbook()
ws = wb.active
ws.title = 'Sales Report'

# Headers (bold, colored background)
headers = ['Product', 'Q1', 'Q2', 'Q3', 'Q4', 'Total']
for col, header in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col, value=header)
    cell.font = Font(bold=True)
    cell.fill = PatternFill(start_color='4472C4', fill_type='solid')

# Data
data = [
    ['Product A', 1000, 1200, 1100, 1300],
    ['Product B', 800, 900, 950, 1000],
]

for row_idx, row_data in enumerate(data, 2):
    for col_idx, value in enumerate(row_data, 1):
        ws.cell(row=row_idx, column=col_idx, value=value)

# Auto-size columns
for column in ws.columns:
    max_length = max(len(str(cell.value)) for cell in column)
    ws.column_dimensions[column[0].column_letter].width = max_length + 2

wb.save('/home/user/sales.xlsx')
```

**Agent Prompt:**
> "Create an Excel file with openpyxl. Add a sheet named 'Report' with headers in row 1 (bold, blue background). Fill in 5 rows of sample data with numbers. Auto-size columns. Save to /home/user/data.xlsx"

## Viewing Generated Documents

### In Desktop Environment

| File Type | Application | Command |
|-----------|-------------|---------|
| .pptx | LibreOffice Impress | `libreoffice --impress file.pptx` |
| .docx | LibreOffice Writer | `libreoffice --writer file.docx` |
| .xlsx | LibreOffice Calc | `libreoffice --calc file.xlsx` |
| .pdf | Chrome | `chromium-browser file.pdf` |

### Desktop Shortcuts

All LibreOffice applications are available as desktop shortcuts:
- **Writer** - Word document editor
- **Calc** - Spreadsheet editor
- **Impress** - Presentation editor

## Document Conversion with Pandoc

Convert between formats using pandoc:

```bash
# Markdown to Word
pandoc input.md -o output.docx

# Markdown to PDF
pandoc input.md -o output.pdf

# Word to HTML
pandoc input.docx -o output.html

# HTML to Markdown
pandoc input.html -o output.md
```

## PDF Utilities (poppler-utils)

```bash
# Convert PDF to images
pdftoppm input.pdf output -png

# Extract text from PDF
pdftotext input.pdf output.txt

# Get PDF info
pdfinfo input.pdf

# Merge PDFs
pdfunite file1.pdf file2.pdf merged.pdf
```

## Best Practices for AI Agents

### 1. File Paths
- Always use absolute paths: `/home/user/filename.ext`
- Create subdirectories if needed: `/home/user/reports/monthly.pdf`

### 2. Error Handling
- Check if libraries are installed before use
- Verify file was created: `ls -lh /home/user/output.pdf`
- Test file can be opened: `file /home/user/output.pdf`

### 3. Workflow Integration
- Generate documents as part of multi-step workflows
- Use Desktop agent to open and verify documents
- Take screenshots to confirm successful creation

### 4. Prompt Engineering
- Be specific about formatting requirements
- Specify exact file paths
- Include verification steps (open file, take screenshot)

## Example Multi-Step Workflow

**Task:** "Create a sales report presentation"

**Steps:**
1. **Data Collection** (Web Agent): Scrape sales data from dashboard
2. **Excel Generation** (Desktop Agent): Create spreadsheet with openpyxl
3. **PowerPoint Creation** (Desktop Agent): Generate presentation with pptxgenjs
4. **Verification** (Desktop Agent): Open presentation, take screenshots
5. **Delivery** (Web Agent): Upload to Google Drive or email

## Troubleshooting

### Library Not Found
```bash
# Check if installed
npm list -g pptxgenjs
pip3 show reportlab

# Reinstall if needed
npm install -g pptxgenjs
pip3 install reportlab
```

### Permission Denied
```bash
# Ensure user owns the directory
sudo chown -R user:user /home/user
chmod 755 /home/user
```

### LibreOffice Won't Open
```bash
# Check if running
ps aux | grep libreoffice

# Kill existing processes
pkill -9 libreoffice

# Restart X server if needed
sudo systemctl restart supervisor
```

## Summary

The ARIA desktop environment provides complete document generation capabilities:
- ✅ PowerPoint, Word, Excel, PDF creation via code
- ✅ LibreOffice suite for viewing/editing
- ✅ Pandoc for format conversion
- ✅ PDF utilities for manipulation
- ✅ Desktop shortcuts for easy access
- ✅ Full automation support for AI agents
