const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { google } = require('googleapis');
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// WhatsApp Client Setup
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './session'
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('Scan this QR code with WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp client is ready!');
    startEmailMonitoring();
});

client.on('authenticated', () => {
    console.log('WhatsApp client authenticated');
});

client.on('auth_failure', (message) => {
    console.error('WhatsApp authentication failed:', message);
});

client.initialize();

// API keys and credentials storage
const credsFilePath = path.join(__dirname, 'credentials.json');

// Load credentials from file, fallback to env variables
function loadCredentials() {
    try {
        if (fs.existsSync(credsFilePath)) {
            const data = fs.readFileSync(credsFilePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading credentials:', error);
    }
    
    // Fallback to environment variables
    return {
        gmailClientId: process.env.GMAIL_CLIENT_ID || '',
        gmailClientSecret: process.env.GMAIL_CLIENT_SECRET || '',
        gmailRefreshToken: process.env.GMAIL_REFRESH_TOKEN || ''
    };
}

// Save credentials to file
function saveCredentials(creds) {
    try {
        fs.writeFileSync(credsFilePath, JSON.stringify(creds, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving credentials:', error);
        return false;
    }
}

// Get current credentials
const credentials = loadCredentials();

// Gmail API Setup
const gmail = google.gmail('v1');
const oauth2Client = new google.auth.OAuth2(
    credentials.gmailClientId,
    credentials.gmailClientSecret,
    'urn:ietf:wg:oauth:2.0:oob'
);

oauth2Client.setCredentials({
    refresh_token: credentials.gmailRefreshToken
});

google.options({ auth: oauth2Client });

// Email tracking
const processedEmailsPath = path.join(__dirname, 'processed_emails.json');
let processedEmails = new Set();

// Load previously processed emails
try {
    if (fs.existsSync(processedEmailsPath)) {
        const data = fs.readFileSync(processedEmailsPath, 'utf8');
        processedEmails = new Set(JSON.parse(data));
        console.log(`Loaded ${processedEmails.size} previously processed emails`);
    }
} catch (error) {
    console.error('Error loading processed emails:', error);
}

// Save processed emails periodically
function saveProcessedEmails() {
    try {
        fs.writeFileSync(
            processedEmailsPath,
            JSON.stringify([...processedEmails]),
            'utf8'
        );
    } catch (error) {
        console.error('Error saving processed emails:', error);
    }
}

async function startEmailMonitoring() {
    console.log('Starting email monitoring...');
    await checkForNewSentEmails(); // Check immediately on startup
    setInterval(checkForNewSentEmails, 30000); // Then check every 30 seconds
    
    // Save processed emails every 5 minutes
    setInterval(saveProcessedEmails, 300000);
}

async function checkForNewSentEmails() {
    try {
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: 'in:sent',
            maxResults: 10
        });

        const messages = response.data.messages || [];
        let newEmailsFound = 0;
        
        for (const message of messages) {
            if (!processedEmails.has(message.id)) {
                await processNewEmail(message.id);
                processedEmails.add(message.id);
                newEmailsFound++;
            }
        }
        
        if (newEmailsFound > 0) {
            console.log(`Processed ${newEmailsFound} new sent emails`);
            saveProcessedEmails();
        }
    } catch (error) {
        console.error('Error checking emails:', error);
    }
}

async function processNewEmail(messageId) {
    try {
        const email = await gmail.users.messages.get({
            userId: 'me',
            id: messageId
        });

        const headers = email.data.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const to = headers.find(h => h.name === 'To')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value || '';

        console.log(`Processing email: "${subject}" sent to ${to}`);

        // Extract email content for summary
        let body = '';
        if (email.data.payload.parts && email.data.payload.parts.length) {
            // Find text part
            const textPart = email.data.payload.parts.find(
                part => part.mimeType === 'text/plain' && part.body.data
            );
            
            if (textPart && textPart.body.data) {
                body = Buffer.from(textPart.body.data, 'base64').toString();
            } else {
                // Try to find HTML part if text not available
                const htmlPart = email.data.payload.parts.find(
                    part => part.mimeType === 'text/html' && part.body.data
                );
                
                if (htmlPart && htmlPart.body.data) {
                    const htmlBody = Buffer.from(htmlPart.body.data, 'base64').toString();
                    body = htmlBody.replace(/<[^>]*>/g, ''); // Strip HTML tags
                }
            }
        } else if (email.data.payload.body.data) {
            // Direct body data
            body = Buffer.from(email.data.payload.body.data, 'base64').toString();
        }

        // Create summary (simple version to avoid AI costs)
        const summary = createSimpleSummary(subject, body);

        // Send WhatsApp message for matching recipients
        await sendWhatsAppMessage(to, subject, summary);

    } catch (error) {
        console.error('Error processing email:', error);
    }
}

function createSimpleSummary(subject, body) {
    // Clean up the body text
    const cleanBody = body.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
    const shortBody = cleanBody.substring(0, 100);
    
    // Create random variations to avoid repetitive messages
    const variations = [
        `Just sent you an email about "${subject}". Quick summary: ${shortBody}...`,
        `Hey! Email sent regarding "${subject}". Brief overview: ${shortBody}...`,
        `Email update: "${subject}" - Here's the gist: ${shortBody}...`,
        `Sent you something about "${subject}". In short: ${shortBody}...`,
        `FYI: Email titled "${subject}" sent to your inbox. It covers: ${shortBody}...`,
        `Quick note: Just emailed you about "${subject}". Main points: ${shortBody}...`
    ];
    
    return variations[Math.floor(Math.random() * variations.length)];
}

async function sendWhatsAppMessage(emailRecipient, subject, summary) {
    try {
        // Extract email addresses (handle multiple recipients)
        const emailAddresses = emailRecipient.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || [];
        
        for (const email of emailAddresses) {
            // Get phone number from mapping
            const phoneNumber = getPhoneFromEmail(email);
            
            if (phoneNumber) {
                const chatId = phoneNumber.replace(/[^0-9]/g, '') + '@c.us';
                console.log(`Sending WhatsApp to ${phoneNumber} for email to ${email}`);
                await client.sendMessage(chatId, summary);
                console.log(`WhatsApp sent successfully to ${phoneNumber}`);
            }
        }
    } catch (error) {
        console.error('Error sending WhatsApp:', error);
    }
}

// Path for contacts storage
const contactsFilePath = path.join(__dirname, 'contacts.json');

// Load contacts from file
function loadContacts() {
    try {
        if (fs.existsSync(contactsFilePath)) {
            const data = fs.readFileSync(contactsFilePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
    return {}; // Return empty object if file doesn't exist or has errors
}

// Save contacts to file
function saveContacts(contacts) {
    try {
        fs.writeFileSync(contactsFilePath, JSON.stringify(contacts, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving contacts:', error);
        return false;
    }
}

function getPhoneFromEmail(email) {
    // Get contacts from storage
    const emailToPhone = loadContacts();
    
    const cleanEmail = email.toLowerCase().trim();
    return emailToPhone[cleanEmail];
}

// API routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
    res.json({
        status: 'running',
        whatsapp: client.info ? 'connected' : 'disconnected',
        processedEmails: processedEmails.size
    });
});

// Get WhatsApp connection status and QR if not connected
app.get('/api/whatsapp/status', (req, res) => {
    if (client.info) {
        res.json({
            connected: true,
            info: {
                name: client.info.pushname,
                phone: client.info.wid.user
            }
        });
    } else {
        res.json({
            connected: false
        });
    }
});

// API route to get contacts
app.get('/api/contacts', (req, res) => {
    const contacts = loadContacts();
    res.json(contacts);
});

// API route to add/update a contact
app.post('/api/contacts', (req, res) => {
    const { email, phone } = req.body;
    
    if (!email || !phone) {
        return res.status(400).json({ error: 'Email and phone are required' });
    }
    
    const contacts = loadContacts();
    contacts[email.toLowerCase().trim()] = phone.replace(/[^0-9]/g, '');
    
    if (saveContacts(contacts)) {
        res.json({ success: true, contacts });
    } else {
        res.status(500).json({ error: 'Failed to save contact' });
    }
});

// API route to delete a contact
app.delete('/api/contacts/:email', (req, res) => {
    const email = req.params.email;
    const contacts = loadContacts();
    
    if (contacts[email]) {
        delete contacts[email];
        
        if (saveContacts(contacts)) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Failed to delete contact' });
        }
    } else {
        res.status(404).json({ error: 'Contact not found' });
    }
});

// API route to get credentials (without secrets)
app.get('/api/credentials', (req, res) => {
    const creds = loadCredentials();
    
    // Return only status, not actual credentials for security
    res.json({
        gmailConfigured: !!(creds.gmailClientId && creds.gmailClientSecret && creds.gmailRefreshToken)
    });
});

// API route to update credentials
app.post('/api/credentials', (req, res) => {
    const { gmailClientId, gmailClientSecret, gmailRefreshToken } = req.body;
    
    if (!gmailClientId || !gmailClientSecret || !gmailRefreshToken) {
        return res.status(400).json({ error: 'All Gmail credentials are required' });
    }
    
    const creds = {
        gmailClientId,
        gmailClientSecret,
        gmailRefreshToken
    };
    
    if (saveCredentials(creds)) {
        // Update the OAuth client with new credentials
        oauth2Client.setCredentials({
            refresh_token: gmailRefreshToken
        });
        
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to save credentials' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
