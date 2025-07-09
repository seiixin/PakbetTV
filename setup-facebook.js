#!/usr/bin/env node

/**
 * Facebook Chat Widget Setup Script
 * 
 * This script helps you set up the Facebook integration for your chat widget.
 * Run this script and provide your Facebook App ID and Page ID when prompted.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Facebook Chat Widget Setup');
console.log('================================\n');
console.log('This script will help you configure the Facebook integration for your chat widget.\n');
console.log('You\'ll need:');
console.log('1. Facebook App ID (from your Facebook Developer account)');
console.log('2. Facebook Page ID (from your business Facebook page)');
console.log('3. Facebook App Secret (from your Facebook Developer account)\n');

const questions = [
  {
    key: 'VITE_FACEBOOK_APP_ID',
    question: 'Enter your Facebook App ID: ',
    description: 'This is found in your Facebook Developer dashboard'
  },
  {
    key: 'VITE_FACEBOOK_PAGE_ID', 
    question: 'Enter your Facebook Page ID: ',
    description: 'This is found in your Facebook page\'s About section'
  },
  {
    key: 'FACEBOOK_APP_SECRET',
    question: 'Enter your Facebook App Secret: ',
    description: 'This is found in your Facebook Developer dashboard (Settings > Basic)',
    isSecret: true
  }
];

const answers = {};

function askQuestion(index) {
  if (index >= questions.length) {
    setupEnvironmentFiles();
    return;
  }

  const question = questions[index];
  console.log(`\n${question.description}`);
  
  rl.question(question.question, (answer) => {
    if (!answer.trim()) {
      console.log('⚠️  This field is required. Please enter a value.');
      askQuestion(index);
      return;
    }
    
    answers[question.key] = answer.trim();
    askQuestion(index + 1);
  });
}

function setupEnvironmentFiles() {
  console.log('\n📝 Setting up environment files...\n');

  // Client .env file
  const clientEnvPath = path.join(__dirname, 'client', '.env');
  const clientEnvContent = `# Facebook Configuration - Auto-generated
VITE_FACEBOOK_APP_ID=${answers.VITE_FACEBOOK_APP_ID}
VITE_FACEBOOK_PAGE_ID=${answers.VITE_FACEBOOK_PAGE_ID}

# Server URL for development
VITE_SERVER_URL=http://localhost:5000
`;

  // Server .env file (update existing or create new)
  const serverEnvPath = path.join(__dirname, 'server', '.env');
  let serverEnvContent = '';
  
  // Try to read existing server .env file
  if (fs.existsSync(serverEnvPath)) {
    serverEnvContent = fs.readFileSync(serverEnvPath, 'utf8');
    
    // Update existing values or add new ones
    if (serverEnvContent.includes('FACEBOOK_APP_ID=')) {
      serverEnvContent = serverEnvContent.replace(/FACEBOOK_APP_ID=.*$/m, `FACEBOOK_APP_ID=${answers.VITE_FACEBOOK_APP_ID}`);
    } else {
      serverEnvContent += `\n# Facebook Configuration\nFACEBOOK_APP_ID=${answers.VITE_FACEBOOK_APP_ID}\n`;
    }
    
    if (serverEnvContent.includes('FACEBOOK_APP_SECRET=')) {
      serverEnvContent = serverEnvContent.replace(/FACEBOOK_APP_SECRET=.*$/m, `FACEBOOK_APP_SECRET=${answers.FACEBOOK_APP_SECRET}`);
    } else {
      serverEnvContent += `FACEBOOK_APP_SECRET=${answers.FACEBOOK_APP_SECRET}\n`;
    }
  } else {
    // Create new server .env file with basic configuration
    serverEnvContent = `# Environment Configuration
NODE_ENV=development
PORT=5000
JWT_SECRET=your-jwt-secret-change-this-in-production

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=fengshui_ecommerce

# Facebook Configuration
FACEBOOK_APP_ID=${answers.VITE_FACEBOOK_APP_ID}
FACEBOOK_APP_SECRET=${answers.FACEBOOK_APP_SECRET}

# Email Configuration (update these for production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
`;
  }

  try {
    // Ensure directories exist
    if (!fs.existsSync(path.join(__dirname, 'client'))) {
      fs.mkdirSync(path.join(__dirname, 'client'), { recursive: true });
    }
    if (!fs.existsSync(path.join(__dirname, 'server'))) {
      fs.mkdirSync(path.join(__dirname, 'server'), { recursive: true });
    }

    // Write client .env file
    fs.writeFileSync(clientEnvPath, clientEnvContent);
    console.log('✅ Created/updated client/.env');

    // Write server .env file
    fs.writeFileSync(serverEnvPath, serverEnvContent);
    console.log('✅ Created/updated server/.env');

    console.log('\n🎉 Facebook integration setup complete!\n');
    console.log('Next steps:');
    console.log('1. Make sure your website domain is added to your Facebook App settings');
    console.log('2. Restart your development server: npm run dev');
    console.log('3. Test the chat widget by clicking the Facebook Messenger icon');
    console.log('4. Messages sent through the widget will appear in your Facebook page inbox\n');
    
    console.log('📚 For more information, see FACEBOOK_SETUP.md\n');

  } catch (error) {
    console.error('❌ Error creating environment files:', error.message);
    console.log('\nPlease create the files manually:');
    console.log('\n📄 client/.env:');
    console.log(clientEnvContent);
    console.log('\n📄 server/.env:');
    console.log(serverEnvContent);
  }

  rl.close();
}

// Start the setup process
askQuestion(0); 