// This file has been deprecated due to infinite loop issues causing rate limiting
// The AddressForm component now uses direct API calls instead of this hook
// Keeping this file for reference but it should not be imported anywhere

export const usePSGC = () => {
  console.warn('usePSGC hook has been deprecated. Use direct API calls in components instead.');
  return {
    regions: [],
    loadingRegions: false,
    errorRegions: null,
    fetchProvinces: () => Promise.resolve([]),
    fetchCities: () => Promise.resolve([]),
    fetchBarangays: () => Promise.resolve([]),
    fetchDistricts: () => Promise.resolve([]),
    validateAddress: () => Promise.resolve({ success: false }),
    refetchRegions: () => Promise.resolve()
  };
};