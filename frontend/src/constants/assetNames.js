// Maps API asset names to display names
export const assetNames = {
  bitcoin: 'Bitcoin',
  ethereum: 'Ethereum',
  solana: 'Solana',
  AAPL: 'Apple',
  GOOG: 'Google',
  NVDA: 'NVIDIA',
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana'
};

// Helper function to get display name
export const getDisplayName = (asset) => {
  return assetNames[asset] || asset;
};