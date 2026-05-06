# Mapping of crypto abbreviations to full names as returned by CoinGecko
CRYPTO_MAPPING = {
    'btc': 'bitcoin',
    'eth': 'ethereum',
    'sol': 'solana',
    'bitcoin': 'bitcoin',
    'ethereum': 'ethereum',
    'solana': 'solana'
}

def normalize_crypto_asset(asset: str) -> str:
    """Convert crypto abbreviation or name to the key used by CoinGecko API"""
    normalized = CRYPTO_MAPPING.get(asset.lower())
    if not normalized:
        raise ValueError(f"Unknown cryptocurrency: {asset}. Supported: btc, eth, sol, bitcoin, ethereum, solana")
    return normalized
