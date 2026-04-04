# Workflow Example Prompts

This file contains natural, human-sounding example prompts for each ARIA workflow. Use these as templates when creating tasks.

---

## 1. google-search

**Prompt:**
> Hey, can you search for "best AI coding assistants 2026" and show me what you find?

**Variables:**
- `query`: "best AI coding assistants 2026"

---

## 2. deep-research

**Prompt:**
> I need you to do deep research on quantum computing breakthroughs in 2025. Search 3 different sources, include Wikipedia, and email the report to john@example.com with CC to sarah@example.com. Make the sender name "Aria Research Team".

**Variables:**
- `topic`: "quantum computing breakthroughs in 2025"
- `max_links`: 3
- `include_wikipedia`: true
- `email_to`: "john@example.com"
- `email_cc`: "sarah@example.com"
- `email_sender_name`: "Aria Research Team"

---

## 3. email-doc-deep-research

**Prompt:**
> Research "sustainable energy solutions for small businesses", create a PowerPoint presentation about it, and email it to client@company.com. Include YouTube research and use 3 web sources.

**Variables:**
- `topic`: "sustainable energy solutions for small businesses"
- `email`: "client@company.com"
- `documentType`: "ppt"
- `includeYouTube`: true
- `maxLinks`: 3
- `maxVideos`: 2

---

## 4. opencode-request

**Prompt:**
> Create a sales presentation with 5 slides about our new product launch. Make it professional with charts and bullet points. Save it as a PowerPoint file.

**Variables:**
- `userRequest`: "Create a sales presentation with 5 slides about our new product launch. Make it professional with charts and bullet points."
- `documentType`: "ppt"

**Alternative Prompt:**
> Build me an Excel budget tracker with categories for income, expenses, and savings. Include formulas to calculate totals automatically.

**Variables:**
- `userRequest`: "Build me an Excel budget tracker with categories for income, expenses, and savings. Include formulas to calculate totals automatically."
- `documentType`: "xlsx"

---

## 5. send-email-n8n

**Prompt:**
> Send an email to team@company.com with subject "Weekly Update" and body "Hi team, here's this week's progress report. We completed 3 major features and fixed 12 bugs. Great work everyone!" CC manager@company.com and make the sender name "Project Lead".

**Variables:**
- `to`: "team@company.com"
- `subject`: "Weekly Update"
- `body`: "Hi team, here's this week's progress report. We completed 3 major features and fixed 12 bugs. Great work everyone!"
- `cc`: "manager@company.com"
- `senderName`: "Project Lead"

---

## 6. send-gmail

**Prompt:**
> Send a Gmail to client@business.com with subject "Proposal Attached" and body "Dear Client, Please find the attached proposal for your review. Let me know if you have any questions. Best regards, John". Attach the file at /home/user/Desktop/proposal.pdf

**Variables:**
- `to`: "client@business.com"
- `subject`: "Proposal Attached"
- `body`: "Dear Client, Please find the attached proposal for your review. Let me know if you have any questions. Best regards, John"
- `attachment`: "/home/user/Desktop/proposal.pdf"

---

## 7. perplexity-linkedin-post

**Prompt:**
> Research "AI agents in customer service" on Perplexity and create a professional LinkedIn post about it. Make it engaging and publish it.

**Variables:**
- `topic`: "AI agents in customer service"

---

## 8. freelancer-research-email

**Prompt:**
> Find 20 coffee shops in Mumbai, create an Excel file with their details, and email it to leads@marketing.com

**Variables:**
- `businessType`: "coffee shops"
- `city`: "Mumbai"
- `recipientEmail`: "leads@marketing.com"
- `maxResults`: 20

---

## 9. summarise-url

**Prompt:**
> Visit https://example.com/article and summarize the content for me. Save it as article_summary.txt on the desktop.

**Variables:**
- `url`: "https://example.com/article"
- `filename`: "article_summary.txt"

---

## 10. youtube-demo

**Prompt:**
> Search YouTube for "machine learning tutorials" and open 2 videos. Generate summaries for them.

**Variables:**
- `topic`: "machine learning tutorials"
- `max_videos`: 2

---

## 11. open-whatsapp

**Prompt:**
> Open WhatsApp and send these messages to 919876543210: "Hi there! | Just checking in | Talk to you soon"

**Variables:**
- `phone`: "919876543210"
- `messages`: "Hi there! | Just checking in | Talk to you soon"

---

## 12. test-pinchtab-eval

**Prompt:**
> Run the PinchTab JavaScript evaluation test on Bing to make sure everything is working correctly.

**Variables:**
- (No user-facing variables - this is a technical test workflow)

---

## Tips for Writing Good Prompts

1. **Be specific**: Include all required details (emails, file paths, numbers)
2. **Use natural language**: Write like you're talking to a human assistant
3. **Include context**: Explain what you want and why when helpful
4. **Specify formats**: Mention file types (PDF, PowerPoint, Excel) when relevant
5. **Provide complete info**: Include all email addresses, phone numbers with country codes, etc.

## Common Variable Patterns

- **Email addresses**: Use full addresses like "user@domain.com"
- **Phone numbers**: Include country code, no spaces: "919876543210"
- **File paths**: Use absolute paths: "/home/user/Desktop/file.pdf"
- **Multiple items**: Separate with commas or " | " depending on workflow
- **Numbers**: Use plain numbers without quotes: 3, 20, 100

---

**Last Updated:** April 4, 2026
