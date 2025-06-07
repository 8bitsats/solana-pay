# 🤖 AI Shopper Agent

An AI agent that can buy any product on Amazon with its wallet and an onchain balance of any ERC20 token.

## 🚀 Get Started

1. Clone the repository:

```bash
git clone https://github.com/Crossmint/shopper-agent.git
cd shopper-agent
```

2. Prerequisites:

- Node & pnpm installed
- Have your wallet's private key ready (otherwise, generate new wallet via `pnpm generate-wallet`)
- Hold USDC
- OpenAI API key
- Crossmint API key 

3. Install dependencies:

```bash
pnpm install
```

4. Copy `.env.template` to `.env` to fill in the appropriate values.

```bash
cp .env.template .env
```

5. Configure your variables:

- `WALLET_PRIVATE_KEY`: Your wallet's private key (will be used for payment)
- `RPC_PROVIDER_URL`: Base network RPC endpoint for transaction processing
- `OPENAI_API_KEY`: Your OpenAI API key for AI interactions
- `CROSSMINT_API_KEY`: Your Crossmint API key 

6. Start the agent 

```bash
pnpm start
```