#!/usr/bin/env python3
"""Email Sender - Send emails easily from the command line
Supports: Gmail, Outlook, and custom SMTP servers"""

import smtplib
import argparse
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from pathlib import Path
import getpass

# SMTP Server configurations
SMTP_SERVERS = {
    'gmail': {
        'server': 'smtp.gmail.com',
        'port': 587,
        'note': 'Use App Password, not regular password. Get it from: https://myaccount.google.com/apppasswords'
    },
    'outlook': {
        'server': 'smtp-mail.outlook.com',
        'port': 587,
        'note': 'Use your regular Outlook password'
    },
    'yahoo': {
        'server': 'smtp.mail.yahoo.com',
        'port': 587,
        'note': 'Use App Password. Get it from Yahoo Account Security settings'
    }
}

def send_email(from_email, to_email, subject, body, attachments=None, smtp_server=None, 
               smtp_port=None, password=None, provider='gmail', cc=None, bcc=None, html=False):
    """Send an email with optional attachments"""
    
    # Get SMTP settings
    if provider in SMTP_SERVERS and not smtp_server:
        smtp_server = SMTP_SERVERS[provider]['server']
        smtp_port = SMTP_SERVERS[provider]['port']
        print(f"Using {provider} SMTP server")
        print(f"Note: {SMTP_SERVERS[provider]['note']}")
    elif not smtp_server:
        raise ValueError("SMTP server not specified and provider not recognized")
    
    # Get password if not provided
    if not password:
        password = getpass.getpass(f"Enter password for {from_email}: ")
    
    # Create message
    msg = MIMEMultipart()
    msg['From'] = from_email
    msg['To'] = to_email
    msg['Subject'] = subject
    
    if cc:
        msg['Cc'] = cc
    if bcc:
        msg['Bcc'] = bcc
    
    # Attach body
    body_type = 'html' if html else 'plain'
    msg.attach(MIMEText(body, body_type))
    
    # Attach files
    if attachments:
        for file_path in attachments:
            if not os.path.exists(file_path):
                print(f"Warning: Attachment not found: {file_path}")
                continue
            
            filename = os.path.basename(file_path)
            with open(file_path, 'rb') as f:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header('Content-Disposition', f'attachment; filename= {filename}')
                msg.attach(part)
            print(f"Attached: {filename}")
    
    # Send email
    try:
        print(f"\nConnecting to {smtp_server}:{smtp_port}...")
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        
        print(f"Logging in as {from_email}...")
        server.login(from_email, password)
        
        # Get all recipients
        all_recipients = [to_email]
        if cc:
            all_recipients.extend([x.strip() for x in cc.split(',')])
        if bcc:
            all_recipients.extend([x.strip() for x in bcc.split(',')])
        
        print(f"Sending email to {to_email}...")
        server.send_message(msg)
        server.quit()
        
        print("\n✅ Email sent successfully!")
        return True
        
    except smtplib.SMTPAuthenticationError:
        print("\n❌ Authentication failed!")
        if provider == 'gmail':
            print("For Gmail, you need to use an App Password, not your regular password.")
            print("Get it here: https://myaccount.google.com/apppasswords")
        return False
        
    except Exception as e:
        print(f"\n❌ Failed to send email: {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(
        description='Send emails from the command line',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  # Basic email
  send_email.py -f you@gmail.com -t recipient@example.com -s "Hello" -b "Test message"
  
  # With attachment
  send_email.py -f you@gmail.com -t recipient@example.com -s "Report" -b "See attached" -a report.pdf
  
  # Multiple attachments
  send_email.py -f you@gmail.com -t recipient@example.com -s "Files" -b "Here are the files" -a file1.pdf file2.xlsx
  
  # With CC and BCC
  send_email.py -f you@gmail.com -t recipient@example.com -s "Meeting" -b "Join us" --cc boss@company.com --bcc hr@company.com
  
  # HTML email
  send_email.py -f you@gmail.com -t recipient@example.com -s "Newsletter" -b "<h1>Hello!</h1>" --html
  
  # Using Outlook
  send_email.py -f you@outlook.com -t recipient@example.com -s "Test" -b "Message" -p outlook

Note: For Gmail, you must use an App Password (not your regular password).
Get it from: https://myaccount.google.com/apppasswords
""")
    
    parser.add_argument('-f', '--from', dest='from_email', required=True,
                        help='Sender email address')
    parser.add_argument('-t', '--to', dest='to_email', required=True,
                        help='Recipient email address')
    parser.add_argument('-s', '--subject', required=True,
                        help='Email subject')
    parser.add_argument('-b', '--body', required=True,
                        help='Email body text')
    parser.add_argument('-a', '--attach', dest='attachments', nargs='+',
                        help='Files to attach')
    parser.add_argument('-p', '--provider', default='gmail',
                        choices=['gmail', 'outlook', 'yahoo', 'custom'],
                        help='Email provider (default: gmail)')
    parser.add_argument('--smtp', dest='smtp_server',
                        help='Custom SMTP server (for custom provider)')
    parser.add_argument('--port', dest='smtp_port', type=int,
                        help='Custom SMTP port (for custom provider)')
    parser.add_argument('--password', help='Email password (will prompt if not provided)')
    parser.add_argument('--cc', help='CC recipients (comma-separated)')
    parser.add_argument('--bcc', help='BCC recipients (comma-separated)')
    parser.add_argument('--html', action='store_true',
                        help='Send body as HTML')
    
    args = parser.parse_args()
    
    send_email(
        from_email=args.from_email,
        to_email=args.to_email,
        subject=args.subject,
        body=args.body,
        attachments=args.attachments,
        smtp_server=args.smtp_server,
        smtp_port=args.smtp_port,
        password=args.password,
        provider=args.provider,
        cc=args.cc,
        bcc=args.bcc,
        html=args.html
    )

if __name__ == '__main__':
    main()
