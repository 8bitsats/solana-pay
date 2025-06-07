// alice-backend.js - Complete X402 + ALICE Token Integration Backend
// This demonstrates how to integrate X402 protocol with Helio Pay, Browser-Use API,
// and support for both ALICE tokens and USDC on Solana

import express from 'express';
import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createTransferInstruction,
  TOKEN_PROGRAM_ID 
} from '@solana/spl-token';
import axios from 'axios';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json());

// Configuration
const config = {
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  helioPublicKey: process.env.HELIO_PUBLIC_KEY,
  helioSecretKey: process.env.HELIO_SECRET_KEY,
  browserUseApiKey: process.env.BROWSER_USE_API_KEY,
  aliceTokenMint: process.env.ALICE_TOKEN_MINT,
  usdcTokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Mainnet USDC
  merchantWallet: process.env.MERCHANT_WALLET,
  aliceWalletKey: process.env.ALICE_WALLET_PRIVATE_KEY
};

// Initialize Solana connection
const connection = new Connection(config.solanaRpcUrl);
const aliceWallet = Keypair.fromSecretKey(bs58.decode(config.aliceWalletKey));

// Token Manager Class
class TokenManager {
  constructor(connection, wallet) {
    this.connection = connection;
    this.wallet = wallet;
    this.tokens = {
      ALICE: {
        mint: new PublicKey(config.aliceTokenMint),
        decimals: 9,
        priceUsd: 0.10 // Example price
      },
      USDC: {
        mint: new PublicKey(config.usdcTokenMint),
        decimals: 6,
        priceUsd: 1.00
      }
    };
  }

  async getBalance(token) {
    try {
      const tokenInfo = this.tokens[token];
      const tokenAccount = await getAssociatedTokenAddress(
        tokenInfo.mint,
        this.wallet.publicKey
      );
      
      const balance = await this.connection.getTokenAccountBalance(tokenAccount);
      return balance.value.uiAmount || 0;
    } catch (error) {
      console.error(`Error getting ${token} balance:`, error);
      return 0;
    }
  }

  async createTransferInstruction(token, amount, recipient) {
    const tokenInfo = this.tokens[token];
    const sourceAccount = await getAssociatedTokenAddress(
      tokenInfo.mint,
      this.wallet.publicKey
    );
    
    const recipientPubkey = new PublicKey(recipient);
    const destinationAccount = await getAssociatedTokenAddress(
      tokenInfo.mint,
      recipientPubkey
    );
    
    const amountInSmallestUnit = Math.floor(amount * Math.pow(10, tokenInfo.decimals));
    
    return createTransferInstruction(
      sourceAccount,
      destinationAccount,
      this.wallet.publicKey,
      amountInSmallestUnit,
      [],
      TOKEN_PROGRAM_ID
    );
  }
}

// X402 Payment Handler Class
class X402PaymentHandler {
  constructor(tokenManager) {
    this.tokenManager = tokenManager;
    this.paymentCache = new Map(); // Cache verified payments
  }

  createPaymentRequirement(amount, token, description) {
    const tokenInfo = this.tokenManager.tokens[token];
    return {
      x402Version: 1,
      accepts: [{
        scheme: 'exact',
        network: 'solana-mainnet',
        maxAmountRequired: (amount * Math.pow(10, tokenInfo.decimals)).toString(),
        resource: description,
        description: description,
        mimeType: 'application/json',
        payTo: config.merchantWallet,
        maxTimeoutSeconds: 300,
        asset: tokenInfo.mint.toString(),
        token: token
      }],
      error: null
    };
  }

  async verifyPayment(paymentHeader) {
    try {
      // Decode payment header
      const paymentData = JSON.parse(
        Buffer.from(paymentHeader, 'base64').toString('utf8')
      );
      
      // Check if already verified
      if (this.paymentCache.has(paymentData.signature)) {
        return this.paymentCache.get(paymentData.signature);
      }
      
      // Verify transaction on Solana
      const transaction = await connection.getTransaction(
        paymentData.signature,
        { commitment: 'confirmed' }
      );
      
      if (!transaction || transaction.meta.err) {
        return { valid: false, error: 'Transaction not found or failed' };
      }
      
      // Cache successful verification
      const result = { 
        valid: true, 
        signature: paymentData.signature,
        amount: paymentData.amount,
        token: paymentData.token
      };
      
      this.paymentCache.set(paymentData.signature, result);
      return result;
    } catch (error) {
      console.error('Payment verification error:', error);
      return { valid: false, error: error.message };
    }
  }
}

// Helio Pay Integration Class
class HelioPayClient {
  constructor(publicKey, secretKey) {
    this.publicKey = publicKey;
    this.secretKey = secretKey;
    this.baseUrl = 'https://api.hel.io/v1';
  }

  async createPaymentLink(amount, token, description) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/paylink/create/api-key?apiKey=${this.publicKey}`,
        {
          template: 'OTHER',
          name: description,
          price: amount * 1000000, // Convert to smallest unit
          pricingCurrency: token === 'ALICE' ? config.aliceTokenMint : config.usdcTokenMint,
          features: {
            requireEmail: false,
            shouldRedirectOnSuccess: true
          },
          recipients: [{
            walletId: config.merchantWallet,
            currencyId: token === 'ALICE' ? config.aliceTokenMint : config.usdcTokenMint
          }],
          description: description
        },
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Helio Pay error:', error.response?.data || error.message);
      throw error;
    }
  }

  async createCharge(paymentRequestId, amount, metadata = {}) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/charge/api-key?apiKey=${this.publicKey}`,
        {
          paymentRequestId,
          requestAmount: amount.toString(),
          prepareRequestBody: {
            customerDetails: {
              additionalJSON: JSON.stringify(metadata)
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Helio charge creation error:', error);
      throw error;
    }
  }
}

// Browser-Use API Integration
class BrowserUseClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.browser-use.com/api/v1';
  }

  async createTask(instructions, structuredOutput = null) {
    try {
      const payload = { task: instructions };
      if (structuredOutput) {
        payload.structured_output_json = JSON.stringify(structuredOutput);
      }
      
      const response = await axios.post(
        `${this.baseUrl}/run-task`,
        payload,
        {
          headers: { 'Authorization': `Bearer ${this.apiKey}` }
        }
      );
      
      return response.data.id;
    } catch (error) {
      console.error('Browser-Use task creation error:', error);
      throw error;
    }
  }

  async getTaskStatus(taskId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/task/${taskId}`,
        {
          headers: { 'Authorization': `Bearer ${this.apiKey}` }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Browser-Use task status error:', error);
      throw error;
    }
  }

  async waitForCompletion(taskId, maxWaitTime = 60000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const task = await this.getTaskStatus(taskId);
      
      if (task.status === 'finished') {
        return { success: true, output: task.output };
      } else if (task.status === 'failed') {
        return { success: false, error: task.error };
      }
      
      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return { success: false, error: 'Task timeout' };
  }
}

// Alice AI Agent Class
class AliceAgent {
  constructor(tokenManager, x402Handler, helioClient, browserUseClient) {
    this.tokenManager = tokenManager;
    this.x402Handler = x402Handler;
    this.helioClient = helioClient;
    this.browserUseClient = browserUseClient;
    
    this.spendingLimits = {
      perTransaction: { ALICE: 100, USDC: 500 },
      daily: { ALICE: 1000, USDC: 2000 }
    };
    
    this.dailySpent = { ALICE: 0, USDC: 0 };
  }

  async processMessage(message, userWallet) {
    const intent = this.analyzeIntent(message);
    
    switch (intent.type) {
      case 'SEARCH':
        return this.handleSearch(intent);
      case 'PURCHASE':
        return this.handlePurchase(intent, userWallet);
      case 'BALANCE':
        return this.handleBalanceCheck();
      case 'PRICE_CHECK':
        return this.handlePriceCheck(intent);
      default:
        return {
          response: "I can help you search for products, check prices, or make purchases. What would you like to do?",
          payments: []
        };
    }
  }

  analyzeIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('search') || lowerMessage.includes('find')) {
      return {
        type: 'SEARCH',
        query: message,
        product: this.extractProduct(message)
      };
    } else if (lowerMessage.includes('buy') || lowerMessage.includes('purchase')) {
      return {
        type: 'PURCHASE',
        query: message,
        product: this.extractProduct(message)
      };
    } else if (lowerMessage.includes('balance')) {
      return { type: 'BALANCE' };
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
      return {
        type: 'PRICE_CHECK',
        query: message,
        product: this.extractProduct(message)
      };
    }
    
    return { type: 'GENERAL', query: message };
  }

  extractProduct(message) {
    // Simple product extraction - in production, use NLP
    const products = ['headphones', 'laptop', 'coffee maker', 'gaming chair', 'monitor'];
    for (const product of products) {
      if (message.toLowerCase().includes(product)) {
        return product;
      }
    }
    return 'general item';
  }

  async handleSearch(intent) {
    const payments = [];
    
    // Simulate API access payment (0.1 ALICE)
    const apiPayment = {
      amount: 0.1,
      token: 'ALICE',
      description: `Search API access for ${intent.product}`,
      timestamp: new Date().toISOString()
    };
    
    payments.push(apiPayment);
    this.dailySpent.ALICE += 0.1;
    
    // Simulate search results
    const searchResults = this.getSearchResults(intent.product);
    
    return {
      response: `I found ${searchResults.length} options for ${intent.product}. Here are the top results...`,
      results: searchResults,
      payments: payments
    };
  }

  async handlePurchase(intent, userWallet) {
    const payments = [];
    
    // First, search for the product (requires payment)
    const searchResult = await this.handleSearch(intent);
    payments.push(...searchResult.payments);
    
    if (searchResult.results.length === 0) {
      return {
        response: "I couldn't find any products matching your request.",
        payments: payments
      };
    }
    
    // Select best product based on criteria
    const selectedProduct = searchResult.results[0];
    
    // Check spending limits
    if (selectedProduct.price > this.spendingLimits.perTransaction.USDC) {
      return {
        response: `The product costs ${selectedProduct.price} USDC, which exceeds your per-transaction limit of ${this.spendingLimits.perTransaction.USDC} USDC.`,
        payments: payments
      };
    }
    
    // Create Browser-Use task for purchase
    const taskId = await this.browserUseClient.createTask(
      `Go to ${selectedProduct.url} and complete the purchase of ${selectedProduct.name}`,
      {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          orderId: { type: 'string' },
          totalPaid: { type: 'number' }
        }
      }
    );
    
    // Wait for completion
    const result = await this.browserUseClient.waitForCompletion(taskId);
    
    if (result.success) {
      const purchasePayment = {
        amount: selectedProduct.price,
        token: 'USDC',
        description: `Purchase of ${selectedProduct.name}`,
        timestamp: new Date().toISOString()
      };
      
      payments.push(purchasePayment);
      this.dailySpent.USDC += selectedProduct.price;
      
      return {
        response: `Successfully purchased ${selectedProduct.name} for ${selectedProduct.price} USDC! Order ID: ${result.output.orderId}`,
        payments: payments,
        order: result.output
      };
    } else {
      return {
        response: `I couldn't complete the purchase: ${result.error}`,
        payments: payments
      };
    }
  }

  async handleBalanceCheck() {
    const aliceBalance = await this.tokenManager.getBalance('ALICE');
    const usdcBalance = await this.tokenManager.getBalance('USDC');
    
    return {
      response: `Your current balances:\n- ALICE: ${aliceBalance}\n- USDC: ${usdcBalance}\n\nDaily spent:\n- ALICE: ${this.dailySpent.ALICE}\n- USDC: ${this.dailySpent.USDC}`,
      payments: []
    };
  }

  async handlePriceCheck(intent) {
    // This would typically make an API call
    const priceData = this.getPriceData(intent.product);
    
    return {
      response: `Price range for ${intent.product}: ${priceData.min} - ${priceData.max} USDC`,
      payments: [],
      priceData: priceData
    };
  }

  getSearchResults(product) {
    // Mock data - in production, this would call real APIs
    const mockResults = {
      'headphones': [
        { name: 'Sony WH-1000XM5', price: 349.99, url: 'https://example.com/sony' },
        { name: 'AirPods Pro 2', price: 249.99, url: 'https://example.com/airpods' }
      ],
      'laptop': [
        { name: 'MacBook Air M2', price: 999.00, url: 'https://example.com/macbook' },
        { name: 'Dell XPS 13', price: 1199.00, url: 'https://example.com/dell' }
      ]
    };
    
    return mockResults[product] || [];
  }

  getPriceData(product) {
    // Mock price data
    const priceRanges = {
      'headphones': { min: 50, max: 500 },
      'laptop': { min: 500, max: 3000 },
      'coffee maker': { min: 30, max: 300 }
    };
    
    return priceRanges[product] || { min: 0, max: 1000 };
  }
}

// Initialize services
const tokenManager = new TokenManager(connection, aliceWallet);
const x402Handler = new X402PaymentHandler(tokenManager);
const helioClient = new HelioPayClient(config.helioPublicKey, config.helioSecretKey);
const browserUseClient = new BrowserUseClient(config.browserUseApiKey);
const aliceAgent = new AliceAgent(tokenManager, x402Handler, helioClient, browserUseClient);

// API Routes

// X402 Payment Middleware
const requirePayment = (amount, token, description) => {
  return async (req, res, next) => {
    const paymentHeader = req.headers['x-payment'];
    
    if (!paymentHeader) {
      // Return 402 Payment Required
      return res.status(402).json(
        x402Handler.createPaymentRequirement(amount, token, description)
      );
    }
    
    // Verify payment
    const verification = await x402Handler.verifyPayment(paymentHeader);
    
    if (verification.valid) {
      req.payment = verification;
      next();
    } else {
      res.status(400).json({ error: 'Invalid payment', details: verification.error });
    }
  };
};

// Chat endpoint
app.post('/api/alice/chat', async (req, res) => {
  try {
    const { message, wallet } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }
    
    const result = await aliceAgent.processMessage(message, wallet);
    res.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected search endpoint with X402
app.get('/api/search/:query', 
  requirePayment(0.1, 'ALICE', 'Premium search API access'),
  async (req, res) => {
    const { query } = req.params;
    
    // Simulate premium search results
    const results = {
      query: query,
      results: [
        { name: 'Premium Result 1', relevance: 0.95 },
        { name: 'Premium Result 2', relevance: 0.89 }
      ],
      payment: req.payment
    };
    
    res.json(results);
  }
);

// Balance endpoint
app.get('/api/balance', async (req, res) => {
  try {
    const aliceBalance = await tokenManager.getBalance('ALICE');
    const usdcBalance = await tokenManager.getBalance('USDC');
    
    res.json({
      balances: {
        ALICE: aliceBalance,
        USDC: usdcBalance
      },
      wallet: aliceWallet.publicKey.toString()
    });
  } catch (error) {
    console.error('Balance check error:', error);
    res.status(500).json({ error: 'Failed to check balance' });
  }
});

// Helio webhook endpoint
app.post('/webhook/helio', async (req, res) => {
  try {
    const { event, transactionObject } = req.body;
    
    if (event === 'CREATED' && transactionObject?.meta?.transactionStatus === 'SUCCESS') {
      console.log('Payment received:', {
        amount: transactionObject.meta.amount,
        token: transactionObject.meta.currency,
        from: transactionObject.meta.senderPK
      });
      
      // Process successful payment
      // Update user credits, grant access, etc.
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '1.0.0',
    services: {
      solana: 'connected',
      helio: 'configured',
      browserUse: 'ready',
      alice: 'active'
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Alice AI Backend running on port ${PORT}`);
  console.log(`X402 Protocol: Enabled`);
  console.log(`ALICE Token: ${config.aliceTokenMint}`);
  console.log(`Merchant Wallet: ${config.merchantWallet}`);
});

// Export for testing
export { app, aliceAgent, tokenManager };