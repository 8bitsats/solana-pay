import {
  createCrossmint,
  CrossmintWallets,
} from '@crossmint/wallets-sdk';

// Sample code to verify the package is working
console.log('Testing @crossmint/wallets-sdk integration');
console.log('Available exports:', Object.keys({ createCrossmint, CrossmintWallets }));

// This would be used in a real application:
// const crossmint = createCrossmint({
//   apiKey: "<YOUR_API_KEY>",
//   jwt: "<USER_TOKEN>", // Not needed for server wallets
// });
// const crossmintWallets = CrossmintWallets.from(crossmint);
