"use client";

import React, { useState, useMemo } from 'react';
import { Globe, ChevronDown, Search } from 'lucide-react';
import { useCurrency, Country } from '@/contexts/currency-context';

export default function CurrencySelector() {
  const { selectedCountry, countries, selectCountry, loading, error } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  console.log('💱 CurrencySelector render:', { loading, countriesLength: countries.length, isOpen, error });

  // Filter countries based on search query
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countries;
    
    const query = searchQuery.toLowerCase();
    return countries.filter((country) => {
      const countryName = country.name.common.toLowerCase();
      const currencyCode = Object.keys(country.currencies)[0]?.toLowerCase();
      const currencyName = Object.values(country.currencies)[0]?.name?.toLowerCase();
      
      return (
        countryName.includes(query) ||
        currencyCode.includes(query) ||
        currencyName?.includes(query)
      );
    });
  }, [countries, searchQuery]);

  // Show loading state only when actually loading, not when there's an error
  if (loading && countries.length === 0) {
    console.log('💱 CurrencySelector showing loading state');
    return (
      <div className="w-10 h-10 rounded-full border bg-white flex items-center justify-center">
        <Globe className="h-4 w-4 animate-pulse" />
      </div>
    );
  }

  // Show error state if there's an error
  if (error && countries.length === 0) {
    console.log('💱 CurrencySelector showing error state:', error);
    return (
      <div className="w-10 h-10 rounded-full border bg-red-100 flex items-center justify-center" title={error}>
        <Globe className="h-4 w-4 text-red-600" />
      </div>
    );
  }

  // Show default state if no countries loaded yet
  if (countries.length === 0) {
    console.log('💱 CurrencySelector showing default state (no countries)');
    return (
      <div className="relative">
        <button
          onClick={() => {
            console.log('💱 Retry button clicked - triggering countries load');
            window.location.reload(); // Simple retry by refreshing the page
          }}
          className="w-10 h-10 rounded-full border bg-white flex items-center justify-center hover:bg-gray-50 transition-colors"
          title="Click to retry loading countries"
        >
          <Globe className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    );
  }

  const currentCurrency = selectedCountry 
    ? Object.keys(selectedCountry.currencies)[0] 
    : 'NOK';
  const currentSymbol = selectedCountry 
    ? Object.values(selectedCountry.currencies)[0]?.symbol 
    : 'kr';

  const handleClick = () => {
    console.log('💱 Globe icon clicked!');
    setIsOpen(!isOpen);
    setSearchQuery(''); // Reset search when opening
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-3 py-2 rounded-full border bg-white hover:bg-gray-50 transition-colors shadow-sm"
        title={`Current currency: ${currentCurrency}`}
      >
        <Globe className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium">{currentSymbol}</span>
        <ChevronDown className="h-3 w-3 text-gray-500" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg border shadow-lg z-50">
            <div className="p-3 border-b bg-gray-50">
              <div className="text-sm font-medium text-gray-900">Select Currency</div>
              <div className="text-xs text-gray-500">Search country or currency</div>
            </div>
            
            {/* Search Input */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Countries List */}
            <div className="max-h-64 overflow-y-auto">
              {filteredCountries.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No countries found matching "{searchQuery}"
                </div>
              ) : (
                <div className="p-2">
                  {filteredCountries.map((country) => {
                    const currencyCode = Object.keys(country.currencies)[0];
                    const currency = Object.values(country.currencies)[0];
                    
                    return (
                      <button
                        key={country.cca2}
                        onClick={() => {
                          selectCountry(country);
                          setIsOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors ${
                        selectedCountry?.cca2 === country.cca2 ? 'bg-blue-50 text-blue-700 border border-blue-200' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{country.name.common}</div>
                            <div className="text-xs text-gray-500">
                              {currencyCode} - {currency?.name}
                            </div>
                          </div>
                          <div className="text-lg font-bold ml-2 shrink-0">
                            {currency?.symbol}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
