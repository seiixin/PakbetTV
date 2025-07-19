import { useState, useEffect, useCallback } from 'react';

// Base URL for the PSGC (Philippine Standard Geographic Code) API
const BASE_URL = 'https://psgc.gitlab.io/api';

/**
 * Custom hook that provides helper methods to retrieve PSGC geographic data.
 *
 * This hook downloads the list of regions on mount and exposes async helper
 * functions for lazily fetching the provinces / cities-municipalities /
 * barangays that belong to a chosen higher-level division.
 *
 * The hook only activates when the `country` argument is set to "PH".
 */
export const usePSGC = (country = 'PH') => {
  const [regions, setRegions] = useState([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [errorRegions, setErrorRegions] = useState(null);

  // Fetch regions once when the country is PH
  const fetchRegions = useCallback(async () => {
    if (country !== 'PH') return; // Only relevant for Philippines

    setLoadingRegions(true);
    try {
      const res = await fetch(`${BASE_URL}/regions/`);
      if (!res.ok) throw new Error(`Failed to fetch regions: ${res.status}`);
      const data = await res.json();
      setRegions(data);
      setErrorRegions(null);
    } catch (err) {
      console.error(err);
      setErrorRegions(err.message || 'Unable to fetch regions');
    } finally {
      setLoadingRegions(false);
    }
  }, [country]);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  // Helper methods for the rest of the hierarchy ---------------------------
  const fetchProvinces = async (regionCode) => {
    if (!regionCode) return [];
    const res = await fetch(`${BASE_URL}/regions/${regionCode}/provinces/`);
    if (!res.ok) throw new Error('Failed to fetch provinces');
    return res.json();
  };

  const fetchCities = async (provinceCode) => {
    if (!provinceCode) return [];
    const res = await fetch(`${BASE_URL}/provinces/${provinceCode}/cities-municipalities/`);
    if (!res.ok) throw new Error('Failed to fetch cities/municipalities');
    return res.json();
  };

  const fetchBarangays = async (cityCode) => {
    if (!cityCode) return [];
    const res = await fetch(`${BASE_URL}/cities-municipalities/${cityCode}/barangays/`);
    if (!res.ok) throw new Error('Failed to fetch barangays');
    return res.json();
  };

  return {
    // State
    regions,
    loadingRegions,
    errorRegions,
    // Helpers
    fetchProvinces,
    fetchCities,
    fetchBarangays
  };
}; 