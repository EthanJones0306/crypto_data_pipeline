import json
import os
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)
STATUS_FILE = 'api_status.json'

# Rate limit constants
RATE_LIMITS = {
    'finnhub': {'limit': 60, 'period': 'minute'},
    'alphavantage': {'limit': 25, 'period': 'day'},
    'coingecko': {'limit': 10, 'period': 'second'}  # 10 per second
}

def initialize_status():
    """Initialize status file if it doesn't exist"""
    if not os.path.exists(STATUS_FILE):
        status = {
            'timestamp': datetime.now().isoformat(),
            'providers': {
                'finnhub': {'calls_today': 0, 'rate_limit': 60, 'calls_remaining': 60, 'last_call': None, 'status': 'unknown'},
                'alphavantage': {'calls_today': 0, 'rate_limit': 25, 'calls_remaining': 25, 'last_call': None, 'status': 'unknown'},
                'coingecko': {'calls_today': 0, 'rate_limit': 1000, 'calls_remaining': 1000, 'last_call': None, 'status': 'unknown'}
            }
        }
        save_status(status)
        return status
    return load_status()

def load_status():
    """Load API status from file"""
    try:
        with open(STATUS_FILE, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading status: {e}")
        return initialize_status()

def save_status(status):
    """Save API status to file"""
    try:
        with open(STATUS_FILE, 'w') as f:
            json.dump(status, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving status: {e}")

def reset_daily_counts():
    """Reset daily call counts if it's a new day"""
    status = load_status()
    last_timestamp = datetime.fromisoformat(status.get('timestamp', datetime.now().isoformat()))
    
    # If more than 24 hours have passed, reset counts
    if datetime.now() - last_timestamp > timedelta(hours=24):
        status['providers']['alphavantage']['calls_today'] = 0
        status['providers']['alphavantage']['calls_remaining'] = 25
        status['providers']['coingecko']['calls_today'] = 0
        status['providers']['coingecko']['calls_remaining'] = 1000
        status['timestamp'] = datetime.now().isoformat()
        save_status(status)
    
    return status

def log_api_call(provider, calls_remaining=None, rate_limit=None):
    """Log an API call for a provider"""
    status = reset_daily_counts()
    
    if provider not in status['providers']:
        logger.warning(f"Unknown provider: {provider}")
        return
    
    provider_status = status['providers'][provider]
    provider_status['calls_today'] += 1
    provider_status['last_call'] = datetime.now().isoformat()
    
    # Update remaining calls from actual API response if provided
    if calls_remaining is not None:
        provider_status['calls_remaining'] = calls_remaining
    else:
        # Estimate based on limit
        if provider == 'finnhub':
            # Finnhub: 60 per minute, so we don't track across days
            provider_status['calls_remaining'] = 60 - (provider_status['calls_today'] % 60)
        elif provider == 'alphavantage':
            provider_status['calls_remaining'] = max(0, 25 - provider_status['calls_today'])
        elif provider == 'coingecko':
            provider_status['calls_remaining'] = max(0, 1000 - provider_status['calls_today'])
    
    # Determine status
    remaining_percent = (provider_status['calls_remaining'] / rate_limit * 100) if rate_limit else 100
    if remaining_percent > 30:
        provider_status['status'] = 'ok'
    elif remaining_percent > 10:
        provider_status['status'] = 'warning'
    else:
        provider_status['status'] = 'critical'
    
    if rate_limit:
        provider_status['rate_limit'] = rate_limit
    
    save_status(status)
    
    # Log warning if approaching limit
    if remaining_percent < 20:
        logger.warning(f"⚠️ {provider.upper()} approaching rate limit: {provider_status['calls_remaining']}/{rate_limit} remaining")

def get_status():
    """Get current API status"""
    status = reset_daily_counts()
    return status['providers']

def get_status_summary():
    """Get a summary of API status with warnings"""
    providers = get_status()
    summary = {
        'timestamp': datetime.now().isoformat(),
        'providers': {}
    }
    
    for provider, data in providers.items():
        summary['providers'][provider] = {
            'calls_today': data['calls_today'],
            'calls_remaining': data['calls_remaining'],
            'rate_limit': data['rate_limit'],
            'last_call': data['last_call'],
            'status': data['status'],
            'usage_percent': round((data['calls_today'] / data['rate_limit'] * 100), 1) if data['rate_limit'] > 0 else 0
        }
    
    return summary
