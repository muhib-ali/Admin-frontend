"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Country {
  name: {
    common: string;
    official: string;
  };
  cca2: string;
  currencies: {
    [key: string]: {
      name: string;
      symbol: string;
    };
  };
}

export interface ExchangeRates {
  [currency: string]: number;
}

interface CurrencyContextType {
  selectedCountry: Country | null;
  countries: Country[];
  exchangeRates: ExchangeRates | null;
  loading: boolean;
  error: string | null;
  selectCountry: (country: Country) => void;
  convertAmount: (amount: number, fromCurrency: string, toCurrency: string) => Promise<number>;
  batchConvertAmounts: (amounts: number[], fromCurrency: string, toCurrency: string) => Promise<number[]>;
  refreshRates: () => Promise<void>;
  getCurrencySymbol: () => string;
  getCurrencyCode: () => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cache for converted amounts to avoid repeated API calls
  const [conversionCache, setConversionCache] = useState<Map<string, number>>(new Map());

  console.log('🌍 CurrencyProvider initialized');

  // Load countries on mount
  useEffect(() => {
    console.log('🌍 CurrencyProvider useEffect - loading countries');
    loadCountries();
    loadSelectedCountry();
  }, []);

  // Load exchange rates when country changes
  useEffect(() => {
    if (selectedCountry) {
      console.log('🌍 Selected country changed, loading exchange rates');
      loadExchangeRates();
    }
  }, [selectedCountry]);

  const loadCountries = async () => {
    try {
      setLoading(true);
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      console.log('🌍 Loading countries from:', `${baseURL}/currency/countries`);
      
      // Get auth token
      const token = localStorage.getItem('access_token') || 
                   document.cookie.split('; ').find(row => row.startsWith('access_token='))?.split('=')[1];
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${baseURL}/currency/countries`, {
        method: 'GET',
        headers,
      });
      
      console.log('🌍 Countries API response status:', response.status);
      const data = await response.json();
      console.log('🌍 Countries API response data:', data);
      
      if (data.status) {
        setCountries(data.data);
        console.log('🌍 Countries loaded successfully:', data.data.length);
      } else {
        setError(data.message || 'Failed to load countries');
        console.error('🌍 Countries API error:', data.message);
      }
    } catch (err) {
      setError('Failed to load countries');
      console.error('🌍 Error loading countries:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedCountry = () => {
    const saved = localStorage.getItem('selectedCountry');
    if (saved) {
      try {
        setSelectedCountry(JSON.parse(saved));
      } catch (err) {
        console.error('Error parsing saved country:', err);
      }
    }
  };

  const loadExchangeRates = async () => {
    if (!selectedCountry) return;

    try {
      const currencyCode = Object.keys(selectedCountry.currencies)[0];
      if (!currencyCode) return;

      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      
      // Get auth token
      const token = localStorage.getItem('access_token') || 
                   document.cookie.split('; ').find(row => row.startsWith('access_token='))?.split('=')[1];
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${baseURL}/currency/rates/${currencyCode}`, {
        method: 'GET',
        headers,
      });
      
      const data = await response.json();
      
      if (data.status) {
        setExchangeRates(data.data.rates);
      } else {
        setError(data.message || 'Failed to load exchange rates');
      }
    } catch (err) {
      setError('Failed to load exchange rates');
      console.error('Error loading exchange rates:', err);
    }
  };

  const selectCountry = (country: Country) => {
    setSelectedCountry(country);
    localStorage.setItem('selectedCountry', JSON.stringify(country));
  };

  const convertAmount = async (amount: number, fromCurrency: string, toCurrency: string): Promise<number> => {
    if (fromCurrency === toCurrency) return amount;

    // Create cache key
    const cacheKey = `${amount}-${fromCurrency}-${toCurrency}`;
    
    // Check cache first
    if (conversionCache.has(cacheKey)) {
      return conversionCache.get(cacheKey)!;
    }

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      
      // Get auth token
      const token = localStorage.getItem('access_token') || 
                   document.cookie.split('; ').find(row => row.startsWith('access_token='))?.split('=')[1];
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${baseURL}/currency/convert`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount,
          from: fromCurrency,
          to: toCurrency,
        }),
      });

      const data = await response.json();
      
      if (data.status) {
        const convertedAmount = data.data.amount;
        // Cache the result
        setConversionCache(prev => new Map(prev.set(cacheKey, convertedAmount)));
        return convertedAmount;
      } else {
        // Handle rate limiting specifically
        if (response.status === 429 || data.message?.includes('Too Many Requests')) {
          console.warn('🌍 Rate limit hit, using cached conversion or fallback');
          // For rate limiting, we'll use a simple approximate conversion
          const commonRates: { [key: string]: number } = {
            'PKR': 280,    // Approximate PKR to USD
            'EUR': 0.85,   // Approximate EUR to USD  
            'GBP': 0.73,   // Approximate GBP to USD
            'INR': 83,     // Approximate INR to USD
            'CAD': 1.25,   // Approximate CAD to USD
            'AUD': 1.35,   // Approximate AUD to USD
          };
          
          let fallbackAmount = amount;
          if (fromCurrency === 'USD' && commonRates[toCurrency]) {
            fallbackAmount = amount * commonRates[toCurrency];
          } else if (toCurrency === 'USD' && commonRates[fromCurrency]) {
            fallbackAmount = amount / commonRates[fromCurrency];
          }
          
          // Cache the fallback result
          setConversionCache(prev => new Map(prev.set(cacheKey, fallbackAmount)));
          return fallbackAmount;
        }
        throw new Error(data.message || 'Conversion failed');
      }
    } catch (err) {
      console.error('Error converting currency:', err);
      // Return original amount as last resort
      return amount;
    }
  };

  const batchConvertAmounts = async (amounts: number[], fromCurrency: string, toCurrency: string): Promise<number[]> => {
    if (fromCurrency === toCurrency) return amounts;

    // Check cache for each amount and only convert uncached ones
    const uncachedAmounts: { index: number; amount: number }[] = [];
    const results: number[] = new Array(amounts.length);

    amounts.forEach((amount, index) => {
      const cacheKey = `${amount}-${fromCurrency}-${toCurrency}`;
      if (conversionCache.has(cacheKey)) {
        results[index] = conversionCache.get(cacheKey)!;
      } else {
        uncachedAmounts.push({ index, amount });
      }
    });

    // Convert uncached amounts in batches to reduce API calls
    if (uncachedAmounts.length > 0) {
      // For now, convert them individually but with delays to avoid rate limiting
      // In a production app, you'd want a proper batch conversion endpoint
      for (const { index, amount } of uncachedAmounts) {
        try {
          const converted = await convertAmount(amount, fromCurrency, toCurrency);
          results[index] = converted;
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('Error in batch conversion:', error);
          results[index] = amount; // Fallback to original amount
        }
      }
    }

    return results;
  };

  const refreshRates = async () => {
    await loadExchangeRates();
  };

  const getCurrencySymbol = (): string => {
    if (!selectedCountry) return '$';
    const currencies = Object.values(selectedCountry.currencies);
    return currencies.length > 0 ? currencies[0].symbol : '$';
  };

  const getCurrencyCode = (): string => {
    if (!selectedCountry) return 'USD';
    return Object.keys(selectedCountry.currencies)[0] || 'USD';
  };

  const value: CurrencyContextType = {
    selectedCountry,
    countries,
    exchangeRates,
    loading,
    error,
    selectCountry,
    convertAmount,
    batchConvertAmounts,
    refreshRates,
    getCurrencySymbol,
    getCurrencyCode,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
