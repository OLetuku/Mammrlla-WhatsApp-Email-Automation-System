/**
 * WhatsApp Email Automation - Frontend Application
 * Handles UI interactions and API calls
 */

// Toast notification helper
const toast = {
  container: null,
  timeoutId: null,
  
  init() {
    // Create toast container if it doesn't exist
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast';
      document.body.appendChild(this.container);
    }
  },
  
  show(message, type = 'info', duration = 3000) {
    this.init();
    
    // Clear any existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    // Set content and style
    this.container.textContent = message;
    this.container.className = `toast toast-${type} show`;
    
    // Auto hide after duration
    this.timeoutId = setTimeout(() => {
      this.container.classList.remove('show');
    }, duration);
  },
  
  success(message, duration = 3000) {
    this.show(message, 'success', duration);
  },
  
  error(message, duration = 3000) {
    this.show(message, 'error', duration);
  },
  
  info(message, duration = 3000) {
    this.show(message, 'info', duration);
  }
};

// API service
const api = {
  async getWhatsAppStatus() {
    try {
      const response = await fetch('/api/whatsapp/status');
      return await response.json();
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
      return { connected: false, error: error.message };
    }
  },
  
  async getSystemHealth() {
    try {
      const response = await fetch('/health');
      return await response.json();
    } catch (error) {
      console.error('Error fetching system health:', error);
      return { status: 'error', error: error.message };
    }
  },
  
  async getCredentialsStatus() {
    try {
      const response = await fetch('/api/credentials');
      return await response.json();
    } catch (error) {
      console.error('Error fetching credentials status:', error);
      return { gmailConfigured: false, error: error.message };
    }
  },
  
  async saveCredentials(credentials) {
    try {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error saving credentials:', error);
      return { success: false, error: error.message };
    }
  },
  
  async getContacts() {
    try {
      const response = await fetch('/api/contacts');
      return await response.json();
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return {};
    }
  },
  
  async saveContact(contact) {
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contact)
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error saving contact:', error);
      return { success: false, error: error.message };
    }
  },
  
  async deleteContact(email) {
    try {
      const response = await fetch(`/api/contacts/${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting contact:', error);
      return { success: false, error: error.message };
    }
  }
};

// DOM Elements
const elements = {
  whatsappStatus: document.getElementById('whatsapp-status'),
  whatsappConnected: document.getElementById('whatsapp-connected'),
  serverStatus: document.getElementById('server-status'),
  processedEmails: document.getElementById('processed-emails'),
  gmailApiStatus: document.getElementById('gmail-api-status'),
  credentialsForm: document.getElementById('credentials-form'),
  gmailClientId: document.getElementById('gmail-client-id'),
  gmailClientSecret: document.getElementById('gmail-client-secret'),
  gmailRefreshToken: document.getElementById('gmail-refresh-token'),
  saveCredentialsBtn: document.getElementById('save-credentials-btn'),
  credentialsFeedback: document.getElementById('credentials-feedback'),
  contactsList: document.getElementById('contacts-list'),
  addContactBtn: document.getElementById('add-contact-btn'),
  contactModal: document.getElementById('contact-modal'),
  contactForm: document.getElementById('contact-form'),
  contactFormMode: document.getElementById('contact-form-mode'),
  contactEmail: document.getElementById('contact-email'),
  contactPhone: document.getElementById('contact-phone'),
  saveContactBtn: document.getElementById('save-contact-btn'),
  cancelContactBtn: document.getElementById('cancel-contact-btn')
};

// App controller
const app = {
  currentContacts: {},
  
  init() {
    this.bindEvents();
    this.loadInitialData();
    
    // Set up periodic status updates
    setInterval(() => this.updateStatus(), 30000);
  },
  
  bindEvents() {
    // Credentials form submission
    elements.credentialsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveCredentials();
    });
    
    // Contact form events
    elements.addContactBtn.addEventListener('click', () => this.showContactModal('add'));
    elements.saveContactBtn.addEventListener('click', () => this.saveContact());
    elements.cancelContactBtn.addEventListener('click', () => this.hideContactModal());
    
    // Close modal when clicking outside
    elements.contactModal.addEventListener('click', (e) => {
      if (e.target === elements.contactModal) {
        this.hideContactModal();
      }
    });
  },
  
  async loadInitialData() {
    await Promise.all([
      this.updateStatus(),
      this.loadCredentialsStatus(),
      this.loadContacts()
    ]);
  },
  
  async updateStatus() {
    try {
      const [whatsappStatus, healthStatus] = await Promise.all([
        api.getWhatsAppStatus(),
        api.getSystemHealth()
      ]);
      
      // Update WhatsApp status
      if (whatsappStatus.connected) {
        elements.whatsappStatus.innerHTML = `
          <div class="status-indicator status-connected"></div>
          <span>Connected as ${whatsappStatus.info.name}</span>
        `;
        elements.whatsappConnected.textContent = 'Connected';
        elements.whatsappConnected.classList.remove('text-white/60', 'text-red-500');
        elements.whatsappConnected.classList.add('text-accent');
      } else {
        elements.whatsappStatus.innerHTML = `
          <div class="status-indicator status-disconnected"></div>
          <span>Disconnected</span>
        `;
        elements.whatsappConnected.textContent = 'Disconnected';
        elements.whatsappConnected.classList.remove('text-white/60', 'text-accent');
        elements.whatsappConnected.classList.add('text-red-500');
      }
      
      // Update health status
      if (healthStatus.status === 'running') {
        elements.serverStatus.textContent = 'Online';
        elements.serverStatus.classList.remove('text-white/60', 'text-red-500');
        elements.serverStatus.classList.add('text-accent');
      } else {
        elements.serverStatus.textContent = 'Offline';
        elements.serverStatus.classList.remove('text-white/60', 'text-accent');
        elements.serverStatus.classList.add('text-red-500');
      }
      
      // Update processed emails count
      if (healthStatus.processedEmails !== undefined) {
        elements.processedEmails.textContent = healthStatus.processedEmails;
        elements.processedEmails.classList.remove('text-white/60');
        elements.processedEmails.classList.add('text-accent');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      elements.serverStatus.textContent = 'Error';
      elements.serverStatus.classList.remove('text-gray-500', 'text-green-500');
      elements.serverStatus.classList.add('text-red-500');
    }
  },
  
  async loadCredentialsStatus() {
    try {
      const credStatus = await api.getCredentialsStatus();
      
      if (credStatus.gmailConfigured) {
        elements.gmailApiStatus.innerHTML = `
          <div class="flex items-center">
            <i class="ri-checkbox-circle-line text-accent mr-2"></i>
            <span>Gmail API configured successfully</span>
          </div>
        `;
        elements.gmailApiStatus.classList.remove('glass');
        elements.gmailApiStatus.classList.add('glass-card', 'border-accent/30');
      } else {
        elements.gmailApiStatus.innerHTML = `
          <div class="flex items-center">
            <i class="ri-error-warning-line text-yellow-500 mr-2"></i>
            <span>Gmail API not configured</span>
          </div>
        `;
        elements.gmailApiStatus.classList.remove('glass');
        elements.gmailApiStatus.classList.add('glass-card', 'border-yellow-500/30');
      }
    } catch (error) {
      console.error('Error loading credentials status:', error);
      elements.gmailApiStatus.innerHTML = `
        <div class="flex items-center">
          <i class="ri-error-warning-line text-red-500 mr-2"></i>
          <span>Error checking Gmail API configuration</span>
        </div>
      `;
      elements.gmailApiStatus.classList.remove('glass');
      elements.gmailApiStatus.classList.add('glass-card', 'border-red-500/30');
    }
  },
  
  async saveCredentials() {
    elements.saveCredentialsBtn.disabled = true;
    elements.saveCredentialsBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Saving...
    `;
    elements.saveCredentialsBtn.classList.add('opacity-75');
    
    try {
      const credentials = {
        gmailClientId: elements.gmailClientId.value.trim(),
        gmailClientSecret: elements.gmailClientSecret.value.trim(),
        gmailRefreshToken: elements.gmailRefreshToken.value.trim()
      };
      
      const result = await api.saveCredentials(credentials);
      
      if (result.success) {
        elements.credentialsFeedback.textContent = 'Credentials saved successfully!';
        elements.credentialsFeedback.className = 'mt-2 text-sm text-green-600';
        toast.success('API keys saved successfully');
        
        // Refresh status
        this.loadCredentialsStatus();
      } else {
        elements.credentialsFeedback.textContent = result.error || 'Failed to save credentials';
        elements.credentialsFeedback.className = 'mt-2 text-sm text-red-600';
        toast.error('Failed to save API keys');
      }
    } catch (error) {
      console.error('Error saving credentials:', error);
      elements.credentialsFeedback.textContent = error.message || 'An error occurred';
      elements.credentialsFeedback.className = 'mt-2 text-sm text-red-600';
      toast.error('Error saving API keys');
    } finally {
      elements.saveCredentialsBtn.disabled = false;
      elements.saveCredentialsBtn.textContent = 'Save API Keys';
      
      // Clear feedback after 5 seconds
      setTimeout(() => {
        elements.credentialsFeedback.textContent = '';
      }, 5000);
    }
  },
  
  async loadContacts() {
    try {
      const contacts = await api.getContacts();
      this.currentContacts = contacts;
      this.renderContacts();
    } catch (error) {
      console.error('Error loading contacts:', error);
      elements.contactsList.innerHTML = `
        <div class="text-sm text-red-500 py-4 text-center">
          <i class="ri-error-warning-line mr-1"></i> Error loading contacts
        </div>
      `;
    }
  },
  
  renderContacts() {
    // Clear the list
    elements.contactsList.innerHTML = '';
    
    const contactEmails = Object.keys(this.currentContacts);
    
    if (contactEmails.length === 0) {
      elements.contactsList.innerHTML = `
        <div class="text-sm text-white/60 py-4 text-center">
          No contacts added yet. Click "Add Contact" to get started.
        </div>
      `;
      return;
    }
    
    // Sort emails alphabetically
    contactEmails.sort();
    
    // Create contact cards
    contactEmails.forEach(email => {
      const phone = this.currentContacts[email];
      const card = document.createElement('div');
      card.className = 'contact-card glass-card rounded-md p-3 flex justify-between items-center';
      
      card.innerHTML = `
        <div>
          <div class="font-medium">${email}</div>
          <div class="text-sm text-white/60">
            <i class="ri-whatsapp-line text-accent mr-1"></i> ${formatPhoneNumber(phone)}
          </div>
        </div>
        <div class="flex space-x-2">
          <button class="edit-contact-btn p-1.5 text-white/60 hover:text-accent rounded-full hover:bg-white/5">
            <i class="ri-edit-line"></i>
          </button>
          <button class="delete-contact-btn p-1.5 text-white/60 hover:text-red-500 rounded-full hover:bg-white/5">
            <i class="ri-delete-bin-line"></i>
          </button>
        </div>
      `;
      
      // Add event listeners
      const editBtn = card.querySelector('.edit-contact-btn');
      const deleteBtn = card.querySelector('.delete-contact-btn');
      
      editBtn.addEventListener('click', () => this.showContactModal('edit', email, phone));
      deleteBtn.addEventListener('click', () => this.confirmDeleteContact(email));
      
      elements.contactsList.appendChild(card);
    });
    
    // Helper function to format phone numbers
    function formatPhoneNumber(phone) {
      // Format international number with spaces
      if (phone.length === 10) {
        return `+1 ${phone.substring(0, 3)} ${phone.substring(3, 6)} ${phone.substring(6)}`;
      } else if (phone.length > 10) {
        // Assume international format
        return `+${phone.substring(0, phone.length - 10)} ${phone.substring(phone.length - 10, phone.length - 7)} ${phone.substring(phone.length - 7, phone.length - 4)} ${phone.substring(phone.length - 4)}`;
      }
      return phone;
    }
  },
  
  showContactModal(mode, email = '', phone = '') {
    elements.contactFormMode.value = mode;
    elements.contactEmail.value = email;
    elements.contactPhone.value = phone;
    
    // Set modal title based on mode
    const modalTitle = document.getElementById('modal-title');
    modalTitle.textContent = mode === 'add' ? 'Add New Contact' : 'Edit Contact';
    
    // Make email field readonly in edit mode
    elements.contactEmail.readOnly = mode === 'edit';
    
    // Show the modal
    elements.contactModal.classList.remove('hidden');
  },
  
  hideContactModal() {
    elements.contactModal.classList.add('hidden');
    elements.contactForm.reset();
  },
  
  async saveContact() {
    // Basic validation
    const email = elements.contactEmail.value.trim();
    const phone = elements.contactPhone.value.trim().replace(/[^0-9+]/g, '');
    
    if (!email || !phone) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (!isValidPhone(phone)) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    // Disable button and show loading state
    elements.saveContactBtn.disabled = true;
    elements.saveContactBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Saving...
    `;
    
    try {
      const result = await api.saveContact({ email, phone });
      
      if (result.success) {
        this.currentContacts = result.contacts || this.currentContacts;
        this.renderContacts();
        this.hideContactModal();
        toast.success(`Contact ${elements.contactFormMode.value === 'add' ? 'added' : 'updated'} successfully`);
      } else {
        toast.error(result.error || 'Failed to save contact');
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error('Error saving contact');
    } finally {
      elements.saveContactBtn.disabled = false;
      elements.saveContactBtn.textContent = 'Save';
    }
    
    // Helper validation functions
    function isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }
    
    function isValidPhone(phone) {
      // Allow + at the beginning followed by at least 8 digits
      const phoneRegex = /^\+?\d{8,15}$/;
      return phoneRegex.test(phone);
    }
  },
  
  confirmDeleteContact(email) {
    if (confirm(`Are you sure you want to delete the contact ${email}?`)) {
      this.deleteContact(email);
    }
  },
  
  async deleteContact(email) {
    try {
      const result = await api.deleteContact(email);
      
      if (result.success) {
        // Remove from current contacts and re-render
        delete this.currentContacts[email];
        this.renderContacts();
        toast.success('Contact deleted successfully');
      } else {
        toast.error(result.error || 'Failed to delete contact');
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Error deleting contact');
    }
  }
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
