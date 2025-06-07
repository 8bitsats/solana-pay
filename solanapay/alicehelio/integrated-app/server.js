import axios from 'axios';
import bs58 from 'bs58';
import cors from 'cors';
import dotenv from 'dotenv';
// server.js - Integrated Alice AI, Solana Pay, and Crossmint Wallet
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  createCrossmint,
  CrossmintWallets,
} from '@crossmint/wallets-sdk';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import {
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Configuration
const config = {
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  helioPublicKey: process.env.HELIO_PUBLIC_KEY,
  helioSecretKey: process.env.HELIO_SECRET_KEY,
  browserUseApiKey: process.env.BROWSER_USE_API_KEY,
  aliceTokenMint: process.env.ALICE_TOKEN_MINT,
  usdcTokenMint: process.env.USDC_TOKEN_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Mainnet USDC
  merchantWallet: process.env.MERCHANT_WALLET,
  aliceWalletKey: process.env.ALICE_WALLET_PRIVATE_KEY,
  crossmintApiKey: process.env.CROSSMINT_API_KEY,
  port: process.env.PORT || 3004
};

// Initialize Solana connection
const connection = new Connection(config.solanaRpcUrl);

// Initialize Alice Wallet (if private key provided)
let aliceWallet;
if (config.aliceWalletKey) {
  try {
    aliceWallet = Keypair.fromSecretKey(bs58.decode(config.aliceWalletKey));
    console.log(`Alice wallet initialized: ${aliceWallet.publicKey.toString()}`);
  } catch (error) {
    console.error('Error initializing Alice wallet:', error);
    console.log('Running in demo mode without a real wallet');
    
    // Create a demo wallet for testing
    aliceWallet = Keypair.generate();
    console.log(`Demo wallet generated: ${aliceWallet.publicKey.toString()}`);
  }
} else {
  console.log('No wallet private key provided. Running in demo mode.');
  aliceWallet = Keypair.generate();
  console.log(`Demo wallet generated: ${aliceWallet.publicKey.toString()}`);
}

// Initialize Crossmint client
let crossmintWallets;
if (config.crossmintApiKey && config.crossmintApiKey.startsWith('ck')) {
  try {
    const crossmint = createCrossmint({
      apiKey: config.crossmintApiKey
    });
    crossmintWallets = CrossmintWallets.from(crossmint);
    console.log('Crossmint wallet service initialized');
  } catch (error) {
    console.error('Error initializing Crossmint:', error);
    console.log('Running without Crossmint integration');
  }
} else {
  console.log('No valid Crossmint API key provided. Running without Crossmint integration.');
}

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
}

// Alice AI Agent Class
class AliceAgent {
  constructor(tokenManager, x402Handler, helioClient, browserUseClient, crossmintWallets) {
    this.tokenManager = tokenManager;
    this.x402Handler = x402Handler;
    this.helioClient = helioClient;
    this.browserUseClient = browserUseClient;
    this.crossmintWallets = crossmintWallets;
    
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
        return this.handleBalanceCheck(userWallet);
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
    
    // Create a payment link via Helio
    let paymentLink;
    try {
      paymentLink = await this.helioClient.createPaymentLink(
        selectedProduct.price,
        'USDC',
        `Purchase of ${selectedProduct.name}`
      );
    } catch (error) {
      return {
        response: `I couldn't create a payment link: ${error.message}`,
        payments: payments
      };
    }
    
    const purchasePayment = {
      amount: selectedProduct.price,
      token: 'USDC',
      description: `Purchase of ${selectedProduct.name}`,
      timestamp: new Date().toISOString(),
      paymentLink: paymentLink.url
    };
    
    payments.push(purchasePayment);
    
    return {
      response: `Ready to purchase ${selectedProduct.name} for ${selectedProduct.price} USDC!`,
      payments: payments,
      paymentLink: paymentLink.url,
      product: selectedProduct
    };
  }

  async handleBalanceCheck(userWallet) {
    if (!userWallet && !this.tokenManager.wallet) {
      return {
        response: "No wallet connected. Please connect a wallet to check your balance.",
        payments: []
      };
    }
    
    let aliceBalance, usdcBalance;
    
    // If using Crossmint wallet
    if (userWallet && this.crossmintWallets) {
      try {
        const wallet = await this.crossmintWallets.getOrCreateWallet("solana-smart-wallet", {
          linkedUser: userWallet
        });
        
        // Here we'd need to integrate with Solana to get token balances for this wallet
        aliceBalance = "Available via Crossmint wallet";
        usdcBalance = "Available via Crossmint wallet";
      } catch (error) {
        console.error('Error with Crossmint wallet:', error);
        aliceBalance = "Error retrieving balance";
        usdcBalance = "Error retrieving balance";
      }
    } else {
      // Use Alice wallet
      aliceBalance = await this.tokenManager.getBalance('ALICE');
      usdcBalance = await this.tokenManager.getBalance('USDC');
    }
    
    return {
      response: `Your current balances:\n- ALICE: ${aliceBalance}\n- USDC: ${usdcBalance}\n\nDaily spent:\n- ALICE: ${this.dailySpent.ALICE}\n- USDC: ${this.dailySpent.USDC}`,
      payments: [],
      balances: {
        ALICE: aliceBalance,
        USDC: usdcBalance,
        dailySpent: this.dailySpent
      }
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
      ],
      'coffee maker': [
        { name: 'Keurig K-Classic', price: 79.99, url: 'https://example.com/keurig' },
        { name: 'Hamilton Beach FlexBrew', price: 89.99, url: 'https://example.com/hamilton' }
      ],
      'gaming chair': [
        { name: 'Secretlab Titan Evo', price: 549.00, url: 'https://example.com/secretlab' },
        { name: 'Razer Iskur', price: 499.00, url: 'https://example.com/razer' }
      ],
      'monitor': [
        { name: 'LG UltraGear 27GN950', price: 799.99, url: 'https://example.com/lg' },
        { name: 'Samsung Odyssey G7', price: 649.99, url: 'https://example.com/samsung' }
      ]
    };
    
    return mockResults[product] || [];
  }

  getPriceData(product) {
    // Mock price data
    const priceRanges = {
      'headphones': { min: 50, max: 500 },
      'laptop': { min: 500, max: 3000 },
      'coffee maker': { min: 30, max: 300 },
      'gaming chair': { min: 150, max: 800 },
      'monitor': { min: 200, max: 1500 }
    };
    
    return priceRanges[product] || { min: 0, max: 1000 };
  }
}

// Initialize services
let tokenManager, x402Handler, helioClient, browserUseClient, aliceAgent;

if (aliceWallet) {
  tokenManager = new TokenManager(connection, aliceWallet);
  x402Handler = new X402PaymentHandler(tokenManager);
}

if (config.helioPublicKey && config.helioSecretKey) {
  helioClient = new HelioPayClient(config.helioPublicKey, config.helioSecretKey);
}

if (config.browserUseApiKey) {
  browserUseClient = new BrowserUseClient(config.browserUseApiKey);
}

if (tokenManager && x402Handler && helioClient && browserUseClient) {
  aliceAgent = new AliceAgent(tokenManager, x402Handler, helioClient, browserUseClient, crossmintWallets);
  console.log('Alice AI Agent initialized');
}

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

// API Routes

// Chat endpoint
app.post('/api/alice/chat', async (req, res) => {
  try {
    const { message, wallet } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }
    
    if (!aliceAgent) {
      return res.status(500).json({ error: 'Alice AI Agent not initialized' });
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
    
    if (!aliceAgent) {
      return res.status(500).json({ error: 'Alice AI Agent not initialized' });
    }
    
    // Simulate premium search results
    const results = aliceAgent.getSearchResults(query);
    
    res.json({
      query: query,
      results: results,
      payment: req.payment
    });
  }
);

// Balance endpoint
app.get('/api/balance', async (req, res) => {
  try {
    if (!tokenManager) {
      return res.status(500).json({ error: 'Token manager not initialized' });
    }
    
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

// Crossmint wallet endpoint
app.post('/api/wallet/create', async (req, res) => {
  try {
    const { userId, type = 'solana-smart-wallet' } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (!crossmintWallets) {
      return res.status(500).json({ error: 'Crossmint wallet service not initialized' });
    }
    
    let wallet;
    try {
      wallet = await crossmintWallets.getOrCreateWallet(type, {
        linkedUser: userId
      });
    } catch (error) {
      console.error('Error creating wallet:', error);
      return res.status(500).json({ error: 'Failed to create wallet' });
    }
    
    res.json({
      address: wallet.address,
      type: type
    });
  } catch (error) {
    console.error('Wallet creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Solana Pay endpoint for payment request
app.get('/api/solana-pay/request', async (req, res) => {
  try {
    const { amount, reference } = req.query;
    
    if (!amount || !reference) {
      return res.status(400).json({ error: 'Amount and reference required' });
    }
    
    // In a real implementation, you would create a Solana Pay payment request here
    // with a reference for tracking and verification
    
    res.json({
      label: 'Alice AI Shopping Assistant',
      icon: 'https://example.com/icon.png',
      recipient: config.merchantWallet,
      amount: parseFloat(amount),
      reference: reference,
      message: 'Payment for Alice AI services',
      memo: `ref:${reference}`
    });
  } catch (error) {
    console.error('Solana Pay request error:', error);
    res.status(500).json({ error: 'Failed to create payment request' });
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
  const services = {
    solana: aliceWallet ? 'connected' : 'not configured',
    helio: helioClient ? 'configured' : 'not configured',
    browserUse: browserUseClient ? 'configured' : 'not configured',
    alice: aliceAgent ? 'active' : 'not initialized',
    crossmint: crossmintWallets ? 'configured' : 'not configured'
  };
  
  res.json({ 
    status: 'ok', 
    version: '1.0.0',
    services: services
  });
});

// Serve main application HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Integrated Alice AI Service running on port ${PORT}`);
  console.log(`X402 Protocol: ${x402Handler ? 'Enabled' : 'Disabled'}`);
  console.log(`Helio Pay: ${helioClient ? 'Configured' : 'Not configured'}`);
  console.log(`Crossmint Wallet: ${crossmintWallets ? 'Configured' : 'Not configured'}`);
});

// Export for testing
export { aliceAgent, app, crossmintWallets, tokenManager };
