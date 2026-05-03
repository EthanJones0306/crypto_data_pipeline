import requests 

# Function to fetch exchange rates for ZAR to USD, EUR, and GBP
# Uses the Frankfurter API to get the latest exchange rates with ZAR as the base currency
def get_zar_exchange_rates():
    url = "https://api.frankfurter.dev/v1/latest?base=ZAR&symbols=USD,EUR,GBP" # API endpoint for fetching exchange rates with ZAR as the base currency

    try:
        response = requests.get(url) # Fetch exchange rates from API
        response.raise_for_status()  # Check if the request was successful
        data = response.json() # Parse  JSON response
        rates_raw = data['rates'] # Extract the exchange rates

        # Calculate and return the dictionary of conversions
        return {
            "USD": round(1 / rates_raw['USD'], 2), 
            "EUR": round(1 / rates_raw['EUR'], 2),
            "GBP": round(1 / rates_raw['GBP'], 2)
        }
        
    except Exception as e:
        print(f"Currency API Error: {e}")
        return None

exchange_rates = get_zar_exchange_rates() # Fetch exchange rates
