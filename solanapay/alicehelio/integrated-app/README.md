# Alice AI Shopping Assistant with X402, Helio Pay, and Crossmint

This project integrates the Alice AI Shopping Assistant with X402 Protocol, Solana Pay, and Crossmint wallet functionality to create a seamless AI-powered shopping experience.

## Features

- **AI Shopping Assistant**: Alice helps users find products, compare prices, and make purchases
- **X402 Protocol Integration**: Micropayments for API access and premium features
- **Solana Pay Support**: Process payments on the Solana blockchain
- **Crossmint Wallet Integration**: Create and manage wallets for users without crypto experience
- **Helio Pay Integration**: Alternative payment processing

## Technologies Used

- **Backend**: Node.js, Express
- **Frontend**: HTML, CSS, JavaScript
- **Blockchain**: Solana, SPL Tokens
- **Wallets**: Crossmint SDK
- **AI Services**: Browser-Use API

## Getting Started

### Prerequisites

- Node.js v20.12.2 or later (but less than v21)
- pnpm or npm
- Solana CLI tools (optional, for advanced testing)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/alice-helio-integrated-app.git
   cd alice-helio-integrated-app
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your API keys and wallet addresses

4. Start the application:
   ```
   npm start
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Configuration

The application uses the following environment variables:

- `SOLANA_RPC_URL`: Solana RPC endpoint
- `MERCHANT_WALLET`: Merchant wallet address to receive payments
- `ALICE_WALLET_PRIVATE_KEY`: Private key for the Alice AI service wallet
- `ALICE_TOKEN_MINT`: ALICE token mint address
- `USDC_TOKEN_MINT`: USDC token mint address (defaults to Solana mainnet USDC)
- `HELIO_PUBLIC_KEY`: Helio Pay public API key
- `HELIO_SECRET_KEY`: Helio Pay secret API key
- `BROWSER_USE_API_KEY`: Browser-Use API key
- `CROSSMINT_API_KEY`: Crossmint API key
- `PORT`: Port for the server (default: 3000)

## API Endpoints

### Chat API

- `POST /api/alice/chat` - Send a message to Alice AI
  - Request Body: `{ message: string, wallet?: string }`
  - Response: Alice's response, with optional payment info and search results

### Wallet API

- `POST /api/wallet/create` - Create a new Crossmint wallet
  - Request Body: `{ userId: string, type?: string }`
  - Response: Wallet address and type

### Balance API

- `GET /api/balance` - Get token balances for the wallet
  - Response: Current balances of ALICE, USDC, and SOL

### X402 Protected Search API

- `GET /api/search/:query` - Protected search endpoint requiring ALICE tokens
  - Requires X-Payment header with valid payment info
  - Response: Search results for the given query

### Payment API

- `GET /api/solana-pay/request` - Generate a Solana Pay payment request
  - Query Parameters: `amount` and `reference`
  - Response: Solana Pay payment request object

### Webhooks

- `POST /webhook/helio` - Webhook for Helio Pay payment notifications

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Solana Pay team for the payment protocol
- Crossmint team for the wallet SDK
- X402 Protocol for the micropayment infrastructure
- Helio Pay for the payment processing services
