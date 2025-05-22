# WhatsApp Email Notification System

A lightweight automation system that sends WhatsApp messages whenever you send emails to specific clients. This solution uses free tiers of services and costs virtually nothing to run (~$0-$1/month).

## Key Features

- Monitors your Gmail account for sent emails
- Automatically sends WhatsApp messages to recipients when you email them
- Uses your personal WhatsApp number (no business account required)
- Stores processed emails to prevent duplicate notifications
- Provides message variations to avoid repetitive text
- Runs on free hosting platforms (Railway, Render, etc.)

## Architecture

- **Gmail API**: Monitor sent emails (free)
- **WhatsApp Web.js**: Send messages via your personal WhatsApp (free)
- **Railway/Render**: Host the automation (free tier - 500 hours/month)
- **Local file storage**: Track processed emails (no database required)

## Prerequisites

- Node.js 16+ installed
- Gmail account
- WhatsApp account
- GitHub account (for deployment)

## Setup Instructions

### 1. Gmail API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project:
   - Click on the project dropdown in the top bar
   - Click "New Project"
   - Enter a name (e.g., "WhatsApp Email Automation")
   - Click "Create"

3. Enable the Gmail API:
   - From the dashboard, go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click on "Gmail API" and then "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - If prompted, configure the OAuth consent screen:
     - User Type: External
     - App name: "WhatsApp Email Automation"
     - User support email: Your email
     - Developer contact information: Your email
     - Click "Save and Continue"
     - Add the Gmail API scope: "https://www.googleapis.com/auth/gmail.readonly"
     - Click "Save and Continue" until complete

   - Return to "Create Credentials" > "OAuth client ID"
   - Application type: Desktop app
   - Name: "WhatsApp Email Automation"
   - Click "Create"
   - Download the JSON file
   - Note your Client ID and Client Secret for later use

5. Get a refresh token:
   - Visit [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
   - Click the gear icon (⚙️) in the top right
   - Check "Use your own OAuth credentials"
   - Enter your Client ID and Client Secret
   - Click "Close"
   - In the left panel, find "Gmail API v1" and select "https://www.googleapis.com/auth/gmail.readonly"
   - Click "Authorize APIs"
   - Sign in with your Gmail account and allow access
   - Click "Exchange authorization code for tokens"
   - Copy the "Refresh token" value for later use

### 2. Configure Your Client List

Edit the `emailToPhone` object in `server.js` to map your client emails to their WhatsApp phone numbers:

```javascript
const emailToPhone = {
    'client1@example.com': '1234567890',
    'client2@example.com': '0987654321',
    // Add your client mappings here
};
```

Make sure to use the international format for phone numbers without any symbols (e.g., '1234567890').

### 3. Local Development Setup

1. Clone the repository and install dependencies:

```bash
git clone [your-repo-url]
cd whatsapp-email-automation
npm install
```

2. Create a `.env` file with your credentials:

```
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_refresh_token
PORT=3000
```

3. Start the development server:

```bash
npm run dev
```

4. When the QR code appears in the console, scan it with your WhatsApp app to authenticate:
   - Open WhatsApp on your phone
   - Tap Menu (⋮) or Settings > WhatsApp Web
   - Tap "Link a Device"
   - Scan the QR code displayed in your terminal

### 4. Deployment Options

#### Railway (Recommended - Free Tier)

1. Create an account at [Railway.app](https://railway.app)
2. Connect your GitHub repository
3. Create a new project from your GitHub repo
4. Add environment variables in the Railway dashboard
5. Deploy the application
6. Check the logs to scan the WhatsApp QR code

#### Render (Alternative - Free Tier)

1. Create an account at [Render.com](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repository
4. Set the build command: `npm install`
5. Set the start command: `node server.js`
6. Add environment variables
7. Deploy the application

## Maintaining Your Application

### WhatsApp Session Management

- The WhatsApp session is stored in the `./session` directory
- You may need to re-authenticate occasionally:
  - Check the logs for a new QR code if messages stop sending
  - Scan the new QR code with your WhatsApp app

### Email Processing

- The system stores processed email IDs in `processed_emails.json`
- This prevents duplicate notifications
- The file is updated every 5 minutes and on shutdown

### Customizing Message Templates

Edit the `createSimpleSummary` function in `server.js` to customize your message templates:

```javascript
function createSimpleSummary(subject, body) {
    // Add or modify message variations here
    const variations = [
        `Just sent you an email about "${subject}". Quick summary: ${shortBody}...`,
        // Add your custom variations
    ];
    
    return variations[Math.floor(Math.random() * variations.length)];
}
```

## Troubleshooting

### WhatsApp Connection Issues

- **Problem**: QR code doesn't appear or WhatsApp disconnects frequently
  - **Solution**: Make sure your deployment platform supports puppeteer and headless Chrome. Railway and Render both work well.

### Gmail API Authorization Errors

- **Problem**: "Invalid Credentials" or "Token expired"
  - **Solution**: Generate a new refresh token using the OAuth 2.0 Playground and update your environment variables.

### Messages Not Sending

- **Problem**: WhatsApp connected but messages not sending
  - **Solution**: 
    1. Check that your email-to-phone mapping is correct
    2. Verify the phone numbers are in the correct format (e.g., '1234567890')
    3. Make sure the recipient is in your WhatsApp contacts

## Cost Optimization

This solution is designed to be extremely cost-effective:

- **Gmail API**: Free for personal use
- **WhatsApp Web**: Free (uses your personal number)
- **Railway/Render**: Free tier (500 hours/month on Railway)
- **No Database**: Uses local file storage to track emails

Total cost: $0/month (assuming you stay within free tiers)

## Limitations

- Requires your phone to be periodically connected to the internet for WhatsApp Web to work
- Not suitable for high-volume email processing (hundreds per day)
- WhatsApp Web sessions may require re-authentication every few weeks
- Your phone number will be visible to recipients

## Future Enhancements

If you need additional features:

- Add a simple database (MongoDB Atlas free tier) for better email tracking
- Implement a basic web interface for configuration
- Add more sophisticated message templates
- Include support for attachments or longer email summaries
