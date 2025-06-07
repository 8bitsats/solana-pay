# X402 + ALICE Token Integration Guide

## Table of Contents

### 🚀 Getting Started
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Architecture Overview](#architecture-overview)

### 💡 Core Concepts
5. [Understanding X402 Protocol](#understanding-x402-protocol)
6. [ALICE Token Economics](#alice-token-economics)
7. [Helio Pay Integration](#helio-pay-integration)
8. [Browser-Use API](#browser-use-api)

### 🛠️ Implementation Guide
9. [Setting Up Your Environment](#setting-up-your-environment)
10. [Creating Your First Alice AI Agent](#creating-your-first-alice-ai-agent)
11. [Implementing X402 Payments](#implementing-x402-payments)
12. [Token Integration (ALICE & USDC)](#token-integration)

### 📱 Demo Applications
13. [Alice Shopping Assistant](#alice-shopping-assistant)
14. [API Monetization Platform](#api-monetization-platform)
15. [Autonomous Trading Bot](#autonomous-trading-bot)

### 🔧 Advanced Topics
16. [Security Best Practices](#security-best-practices)
17. [Scaling Your Solution](#scaling-your-solution)
18. [Troubleshooting](#troubleshooting)

---

## 🚀 Introduction {#introduction}

Welcome to the X402 + ALICE Token Integration Guide! This comprehensive guide will teach you how to build autonomous AI agents that can make payments using the ALICE token and USDC on Solana.

### What You'll Learn
- Build AI agents that can autonomously make payments
- Integrate ALICE token as a payment method
- Use Helio Pay for seamless transaction processing
- Automate web interactions with Browser-Use API
- Create real-world applications with Alice AI

### Why X402 + ALICE?
The combination of X402 protocol with ALICE token creates a powerful ecosystem for AI-driven commerce:
- **Instant Payments**: Sub-second transaction finality on Solana
- **AI-Native**: Designed specifically for autonomous agents
- **Dual Token Support**: Use ALICE for AI services, USDC for stability
- **Zero Friction**: No accounts, KYC, or API keys required

---

## 📋 Prerequisites {#prerequisites}

Before starting, ensure you have:

### Technical Requirements
```bash
# Node.js 18+ and npm
node --version  # Should be 18.0.0 or higher

# Git
git --version

# A code editor (VS Code recommended)
```

### Accounts & Wallets
1. **Solana Wallet** (Phantom or Solflare recommended)
2. **Helio Pay Account** - Sign up at [hel.io](https://hel.io)
3. **Browser-Use API Key** - Get from [browser-use.com](https://browser-use.com)
4. **Some SOL** for transaction fees (0.1 SOL recommended)
5. **Test ALICE tokens** (we'll show you how to get them)

### Knowledge Requirements
- Basic JavaScript/TypeScript
- Understanding of HTTP requests
- Basic blockchain concepts (helpful but not required)

---

## 🏃 Quick Start {#quick-start}

Get up and running in 5 minutes:

```bash
# 1. Clone the starter repository
git clone https://github.com/your-org/x402-alice-starter
cd x402-alice-starter

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env

# 4. Edit .env with your credentials
# SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# HELIO_PUBLIC_KEY=your_helio_public_key
# HELIO_SECRET_KEY=your_helio_secret_key
# BROWSER_USE_API_KEY=your_browser_use_key
# ALICE_TOKEN_MINT=your_alice_token_mint_address
# WALLET_PRIVATE_KEY=your_wallet_private_key

# 5. Run the demo
npm run demo
```

---

## 🏗️ Architecture Overview {#architecture-overview}

The X402 + ALICE integration consists of four main components:

### 1. Alice AI Agent
Your intelligent assistant that:
- Processes natural language requests
- Makes autonomous payment decisions
- Manages ALICE and USDC balances
- Executes web automations

### 2. X402 Protocol Layer
Handles HTTP-native payments:
- Intercepts 402 Payment Required responses
- Creates payment transactions
- Manages payment verification
- Ensures secure token transfers

### 3. Helio Pay Integration
Provides payment infrastructure:
- Processes ALICE token payments
- Handles USDC transactions
- Manages webhooks and confirmations
- Provides merchant tools

### 4. Browser-Use API
Enables web automation:
- Fills forms automatically
- Completes checkout processes
- Extracts data from websites
- Handles CAPTCHAs

---

## 💡 Understanding X402 Protocol {#understanding-x402-protocol}

The X402 protocol revolutionizes internet payments by making them native to HTTP:

### How It Works
1. **Request**: Client requests a resource
2. **402 Response**: Server returns "Payment Required" with details
3. **Payment**: Client creates and sends payment
4. **Access**: Server grants access after verification

### Example Flow
```javascript
// 1. Initial request
GET /api/premium-data
→ 402 Payment Required

// 2. Response includes payment details
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "maxAmountRequired": "1000000", // 1 ALICE token
    "payTo": "ALiCE...wxyz",
    "asset": "ALICE_TOKEN_MINT"
  }]
}

// 3. Retry with payment header
GET /api/premium-data
X-PAYMENT: <base64_encoded_payment>
→ 200 OK (with data)
```

---

## 🪙 ALICE Token Economics {#alice-token-economics}

ALICE is the native utility token for AI services:

### Token Details
- **Name**: ALICE (AI Learning & Intelligence Commerce Engine)
- **Blockchain**: Solana (SPL Token)
- **Total Supply**: 1,000,000,000 ALICE
- **Decimals**: 9

### Use Cases
1. **AI Service Payments**: Pay for API calls, computations, data
2. **Governance**: Vote on protocol improvements
3. **Staking**: Earn rewards by staking ALICE
4. **Incentives**: Reward data providers and validators

### Token Distribution
```
40% - Community & Ecosystem
20% - Development Team
15% - Treasury
15% - Liquidity Provision
10% - Early Investors
```

---

## 🔗 Helio Pay Integration {#helio-pay-integration}

Helio Pay (formerly Solana Pay) provides the payment rails:

### Setup Steps

#### 1. Create a Helio Account
```bash
# Visit https://hel.io
# Sign up for a merchant account
# Complete KYC if required for your volume
```

#### 2. Generate API Keys
Navigate to Dashboard → API Keys → Create New Key

#### 3. Create Payment Links
```javascript
const createPaymentLink = async () => {
  const response = await fetch('https://api.hel.io/v1/paylink/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HELIO_SECRET_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: "AI Service Payment",
      price: 1000000, // 1 ALICE
      token: "ALICE",
      recipient: "YOUR_WALLET_ADDRESS"
    })
  });
  
  return response.json();
};
```

#### 4. Set Up Webhooks
Configure webhooks to receive payment notifications:
```javascript
app.post('/webhook/helio', (req, res) => {
  const { event, transaction } = req.body;
  
  if (event === 'payment.success') {
    // Grant access to the resource
    grantAccess(transaction.paymentId);
  }
  
  res.status(200).send('OK');
});
```

---

## 🌐 Browser-Use API {#browser-use-api}

Browser-Use enables Alice to interact with any website:

### Getting Started
```python
from browser_use import BrowserUse

# Initialize the browser
browser = BrowserUse(api_key="YOUR_API_KEY")

# Create a task
task_id = browser.create_task(
    "Go to amazon.com and search for wireless headphones"
)

# Monitor progress
result = browser.wait_for_completion(task_id)
print(result.output)
```

### Common Use Cases
1. **E-commerce**: Complete purchases automatically
2. **Data Collection**: Scrape product information
3. **Form Filling**: Submit applications or registrations
4. **Testing**: Automate UI testing workflows

---

## ⚙️ Setting Up Your Environment {#setting-up-your-environment}

### Step 1: Install Dependencies
```bash
npm init -y
npm install \
  @solana/web3.js \
  @solana/spl-token \
  @helio-pay/sdk \
  express \
  axios \
  dotenv
```

### Step 2: Project Structure
```
x402-alice-project/
├── src/
│   ├── agents/
│   │   └── alice.js
│   ├── payments/
│   │   ├── x402-handler.js
│   │   └── token-manager.js
│   ├── integrations/
│   │   ├── helio.js
│   │   └── browser-use.js
│   └── server.js
├── .env
├── package.json
└── README.md
```

### Step 3: Configure Solana Connection
```javascript
// src/config/solana.js
import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
);

export const wallet = Keypair.fromSecretKey(
  bs58.decode(process.env.WALLET_PRIVATE_KEY)
);
```

---

## 🤖 Creating Your First Alice AI Agent {#creating-your-first-alice-ai-agent}

Let's build Alice, your AI shopping assistant:

### Step 1: Define Alice's Personality
```javascript
// src/agents/alice.js
export class AliceAgent {
  constructor(config) {
    this.name = "Alice";
    this.personality = {
      helpful: true,
      efficient: true,
      budget_conscious: true
    };
    this.wallet = config.wallet;
    this.spendingLimits = {
      perTransaction: 100, // USDC
      daily: 500 // USDC
    };
  }
  
  async processRequest(userInput) {
    // Natural language processing
    const intent = await this.analyzeIntent(userInput);
    
    switch(intent.type) {
      case 'PURCHASE':
        return this.handlePurchase(intent);
      case 'RESEARCH':
        return this.handleResearch(intent);
      case 'PRICE_CHECK':
        return this.checkPrices(intent);
      default:
        return this.handleGeneral(intent);
    }
  }
}
```

### Step 2: Implement Payment Logic
```javascript
// src/agents/alice-payments.js
import { createX402Payment } from '../payments/x402-handler';

export class AlicePaymentManager {
  async makePayment(amount, token, recipient) {
    // Check spending limits
    if (amount > this.spendingLimits.perTransaction) {
      throw new Error(`Payment exceeds limit: ${amount} ${token}`);
    }
    
    // Create payment based on token type
    if (token === 'ALICE') {
      return this.payWithAlice(amount, recipient);
    } else if (token === 'USDC') {
      return this.payWithUsdc(amount, recipient);
    }
    
    throw new Error(`Unsupported token: ${token}`);
  }
  
  async payWithAlice(amount, recipient) {
    // Implementation for ALICE token payments
    const payment = await createX402Payment({
      amount,
      token: 'ALICE',
      recipient,
      wallet: this.wallet
    });
    
    return payment;
  }
}
```

---

## 💰 Implementing X402 Payments {#implementing-x402-payments}

### Server-Side Implementation
```javascript
// src/server.js
import express from 'express';
import { verifyX402Payment } from './payments/x402-handler';

const app = express();

// Middleware for X402 payments
const requirePayment = (price, token = 'ALICE') => {
  return async (req, res, next) => {
    const paymentHeader = req.headers['x-payment'];
    
    if (!paymentHeader) {
      // Return 402 Payment Required
      return res.status(402).json({
        x402Version: 1,
        accepts: [{
          scheme: 'exact',
          maxAmountRequired: price.toString(),
          payTo: process.env.MERCHANT_WALLET,
          asset: token === 'ALICE' ? process.env.ALICE_MINT : process.env.USDC_MINT,
          description: 'API Access Fee'
        }]
      });
    }
    
    // Verify payment
    const verified = await verifyX402Payment(paymentHeader);
    if (verified) {
      req.payment = verified;
      next();
    } else {
      res.status(400).json({ error: 'Invalid payment' });
    }
  };
};

// Protected endpoint
app.get('/api/search', requirePayment(0.1, 'ALICE'), (req, res) => {
  res.json({ 
    results: 'Premium search results',
    payment: req.payment 
  });
});
```

### Client-Side Implementation
```javascript
// src/client/x402-client.js
export class X402Client {
  async fetchWithPayment(url, options = {}) {
    // First attempt without payment
    let response = await fetch(url, options);
    
    if (response.status === 402) {
      // Parse payment requirements
      const paymentDetails = await response.json();
      
      // Create payment
      const payment = await this.createPayment(paymentDetails);
      
      // Retry with payment header
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'X-Payment': payment.encoded
        }
      });
    }
    
    return response;
  }
}
```

---

## 🪙 Token Integration (ALICE & USDC) {#token-integration}

### Managing Multiple Tokens
```javascript
// src/payments/token-manager.js
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';

export class TokenManager {
  constructor(connection, wallet) {
    this.connection = connection;
    this.wallet = wallet;
    this.tokens = {
      ALICE: {
        mint: new PublicKey(process.env.ALICE_MINT),
        decimals: 9
      },
      USDC: {
        mint: new PublicKey(process.env.USDC_MINT),
        decimals: 6
      }
    };
  }
  
  async getBalance(token) {
    const tokenAccount = await getAssociatedTokenAddress(
      this.tokens[token].mint,
      this.wallet.publicKey
    );
    
    const balance = await this.connection.getTokenAccountBalance(tokenAccount);
    return balance.value.uiAmount;
  }
  
  async transfer(token, amount, recipient) {
    const tokenInfo = this.tokens[token];
    const sourceAccount = await getAssociatedTokenAddress(
      tokenInfo.mint,
      this.wallet.publicKey
    );
    
    const destinationAccount = await getAssociatedTokenAddress(
      tokenInfo.mint,
      new PublicKey(recipient)
    );
    
    const instruction = createTransferInstruction(
      sourceAccount,
      destinationAccount,
      this.wallet.publicKey,
      amount * Math.pow(10, tokenInfo.decimals)
    );
    
    return instruction;
  }
}
```

### Token Swap Integration
```javascript
// src/payments/token-swap.js
export class TokenSwap {
  async swapTokens(fromToken, toToken, amount) {
    // Use Jupiter or Orca for token swaps
    const quote = await this.getQuote(fromToken, toToken, amount);
    
    if (quote.priceImpact > 0.05) {
      throw new Error('Price impact too high');
    }
    
    return this.executeSwap(quote);
  }
}
```

---

## 🛍️ Alice Shopping Assistant Demo {#alice-shopping-assistant}

Here's a complete demo application:

### Frontend Interface
```html
<!-- public/index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Alice Shopping Assistant</title>
  <style>
    .alice-chat {
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .message {
      margin: 10px 0;
      padding: 10px;
      border-radius: 5px;
    }
    .user { background: #e3f2fd; text-align: right; }
    .alice { background: #f3e5f5; }
    .payment-info {
      background: #fff3cd;
      padding: 10px;
      margin: 10px 0;
      border-radius: 5px;
    }
  </style>
</head>
<body>
  <div class="alice-chat">
    <h1>Alice Shopping Assistant</h1>
    <div id="chat-messages"></div>
    <input type="text" id="user-input" placeholder="Ask Alice to help you shop...">
    <button onclick="sendMessage()">Send</button>
    
    <div class="payment-info">
      <strong>Wallet Balance:</strong>
      <span id="alice-balance">0 ALICE</span> | 
      <span id="usdc-balance">0 USDC</span>
    </div>
  </div>
  
  <script src="alice-client.js"></script>
</body>
</html>
```

### Client JavaScript
```javascript
// public/alice-client.js
class AliceClient {
  constructor() {
    this.socket = new WebSocket('ws://localhost:3000');
    this.wallet = null;
    this.setupEventListeners();
  }
  
  async connectWallet() {
    // Connect to Phantom wallet
    const provider = window.solana;
    if (provider) {
      const response = await provider.connect();
      this.wallet = response.publicKey.toString();
      this.updateBalances();
    }
  }
  
  async sendMessage(message) {
    // Display user message
    this.displayMessage(message, 'user');
    
    // Send to Alice backend
    const response = await fetch('/api/alice/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message,
        wallet: this.wallet 
      })
    });
    
    const result = await response.json();
    
    // Display Alice's response
    this.displayMessage(result.response, 'alice');
    
    // Handle any payments made
    if (result.payments) {
      this.displayPayments(result.payments);
    }
  }
  
  displayMessage(text, sender) {
    const messages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = text;
    messages.appendChild(messageDiv);
  }
  
  displayPayments(payments) {
    payments.forEach(payment => {
      const paymentDiv = document.createElement('div');
      paymentDiv.className = 'payment-info';
      paymentDiv.innerHTML = `
        <strong>Payment Made:</strong> ${payment.amount} ${payment.token}<br>
        <strong>For:</strong> ${payment.description}<br>
        <strong>Status:</strong> ${payment.status}
      `;
      document.getElementById('chat-messages').appendChild(paymentDiv);
    });
  }
}

// Initialize Alice
const alice = new AliceClient();
alice.connectWallet();
```

### Backend Implementation
```javascript
// src/alice-backend.js
import { AliceAgent } from './agents/alice';
import { BrowserUseClient } from './integrations/browser-use';

export class AliceBackend {
  constructor() {
    this.alice = new AliceAgent({
      wallet: process.env.ALICE_WALLET_KEY,
      browserUseApiKey: process.env.BROWSER_USE_API_KEY
    });
  }
  
  async handleChatMessage(message, userWallet) {
    try {
      // Process the message
      const intent = await this.alice.analyzeIntent(message);
      
      if (intent.type === 'SHOPPING') {
        return this.handleShopping(intent, userWallet);
      }
      
      // Default response
      return {
        response: "I can help you shop! Just tell me what you're looking for.",
        payments: []
      };
    } catch (error) {
      return {
        response: `Sorry, I encountered an error: ${error.message}`,
        payments: []
      };
    }
  }
  
  async handleShopping(intent, userWallet) {
    const payments = [];
    
    // Step 1: Search for products (may require ALICE payment)
    const searchResponse = await this.searchProducts(intent.query);
    if (searchResponse.payment) {
      payments.push(searchResponse.payment);
    }
    
    // Step 2: Analyze best options
    const recommendation = await this.alice.selectBestProduct(
      searchResponse.products,
      intent.criteria
    );
    
    // Step 3: If user approves, make purchase
    if (intent.autoBuy && recommendation.price <= intent.maxPrice) {
      const purchase = await this.completePurchase(
        recommendation,
        userWallet
      );
      payments.push(purchase.payment);
      
      return {
        response: `I've purchased the ${recommendation.name} for ${recommendation.price} USDC. It will arrive in 2-3 days!`,
        payments,
        order: purchase.order
      };
    }
    
    return {
      response: `I found the perfect option: ${recommendation.name} for ${recommendation.price} USDC. Should I buy it?`,
      payments,
      recommendation
    };
  }
}
```

---

## 🔐 Security Best Practices {#security-best-practices}

### 1. Wallet Security
```javascript
// Never expose private keys in code
// Use environment variables and secure key management

// Good
const wallet = Keypair.fromSecretKey(
  bs58.decode(process.env.WALLET_PRIVATE_KEY)
);

// Bad
const wallet = Keypair.fromSecretKey([1,2,3...]); // Never do this!
```

### 2. Spending Limits
```javascript
class SecureAgent {
  constructor() {
    this.limits = {
      perTransaction: 100,
      hourly: 500,
      daily: 1000
    };
    this.spent = {
      hour: 0,
      day: 0
    };
  }
  
  async checkLimits(amount) {
    if (amount > this.limits.perTransaction) {
      throw new Error('Transaction limit exceeded');
    }
    
    if (this.spent.hour + amount > this.limits.hourly) {
      throw new Error('Hourly limit exceeded');
    }
    
    if (this.spent.day + amount > this.limits.daily) {
      throw new Error('Daily limit exceeded');
    }
  }
}
```

### 3. Payment Verification
```javascript
// Always verify payments server-side
async function verifyPayment(paymentData) {
  // Check signature
  const validSignature = await verifySignature(
    paymentData.signature,
    paymentData.message,
    paymentData.publicKey
  );
  
  // Verify on-chain
  const transaction = await connection.getTransaction(
    paymentData.signature,
    { commitment: 'confirmed' }
  );
  
  // Check amount and recipient
  return (
    validSignature &&
    transaction &&
    transaction.meta.err === null &&
    verifyTransactionDetails(transaction, expectedDetails)
  );
}
```

---

## 📈 Scaling Your Solution {#scaling-your-solution}

### 1. Use Helius RPC for Performance
```javascript
// High-performance RPC endpoint
const connection = new Connection(
  `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
);

// Enable transaction priority fees
const priorityFee = await connection.getRecentPrioritizationFees();
```

### 2. Implement Caching
```javascript
class PaymentCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 300000; // 5 minutes
  }
  
  set(key, value) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl
    });
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
}
```

### 3. Use Worker Threads
```javascript
// Process payments in parallel
import { Worker } from 'worker_threads';

class PaymentProcessor {
  constructor() {
    this.workers = [];
    for (let i = 0; i < 4; i++) {
      this.workers.push(new Worker('./payment-worker.js'));
    }
  }
  
  async processPayment(paymentData) {
    const worker = this.getAvailableWorker();
    return new Promise((resolve, reject) => {
      worker.postMessage(paymentData);
      worker.once('message', resolve);
      worker.once('error', reject);
    });
  }
}
```

---

## 🔧 Troubleshooting {#troubleshooting}

### Common Issues and Solutions

#### 1. "Insufficient ALICE Balance"
```javascript
// Check balance before payment
const balance = await tokenManager.getBalance('ALICE');
if (balance < requiredAmount) {
  // Option 1: Request user to add funds
  // Option 2: Swap USDC for ALICE
  // Option 3: Use fallback payment method
}
```

#### 2. "Transaction Failed"
```javascript
// Implement retry logic
async function sendTransactionWithRetry(transaction, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const signature = await connection.sendTransaction(transaction);
      await connection.confirmTransaction(signature);
      return signature;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

#### 3. "Browser-Use Task Timeout"
```python
# Increase timeout and handle errors
try:
    result = browser.wait_for_completion(
        task_id, 
        timeout=120  # 2 minutes
    )
except TimeoutError:
    # Fallback to manual process
    return manual_checkout_flow()
```

---

## 🎉 Conclusion

Congratulations! You now have the knowledge to build powerful AI agents that can autonomously make payments using the ALICE token and USDC on Solana. The combination of X402 protocol, Helio Pay, and Browser-Use API creates endless possibilities for AI-driven commerce.

### Next Steps
1. Join our Discord community: [discord.gg/x402alice](https://discord.gg/x402alice)
2. Get test ALICE tokens from our faucet
3. Build your first application
4. Share your creations with the community

### Resources
- [GitHub Repository](https://github.com/your-org/x402-alice)
- [API Documentation](https://docs.x402alice.com)
- [Video Tutorials](https://youtube.com/x402alice)
- [Community Forum](https://forum.x402alice.com)

Happy building! 🚀