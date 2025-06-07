# Setting Up the Alice AI Integrated Application

This guide will help you set up and run the Alice AI Shopping Assistant with X402, Helio Pay, and Crossmint integration.

## Prerequisites

- Node.js v18 or later
- npm or pnpm package manager

## Step 1: Install Dependencies

```bash
# Navigate to the integrated app directory
cd alicehelio/integrated-app

# Install dependencies
npm install
```

## Step 2: Configure Environment Variables

The application uses environment variables for configuration. We've provided defaults that will allow the application to run in demo mode without real API keys.

1. Review the `.env` file
2. For production use, replace the placeholder values with real API keys and wallet addresses

## Step 3: Run the Application

```bash
# Start the server
npm start
```

The application should now be running on http://localhost:3003 (or the port specified in your .env file).

## Using the Demo Application

1. Open your browser and navigate to http://localhost:3003
2. You'll see the Alice AI Shopping Assistant interface
3. Try the following example interactions:
   - "Search for headphones"
   - "What's the price range for laptops?"
   - "I want to buy a coffee maker"
   - "Check my balance"

## Troubleshooting

### Port Already in Use

If you see an error like `EADDRINUSE: address already in use :::3000`, change the PORT value in your .env file to an unused port (e.g., 3001, 3002).

### Module Not Found Errors

If you see errors about missing modules, make sure you've installed all dependencies:

```bash
npm install
```

### Wallet or API Key Errors

The application will run in demo mode with mock data if real API keys and wallet addresses aren't provided. This is expected behavior for the demo.

## Next Steps

For full functionality:

1. Generate a Solana wallet and add the private key to your .env file
2. Sign up for Helio Pay and add your API keys
3. Sign up for Crossmint and add your API key
4. Configure the X402 protocol with valid token addresses
