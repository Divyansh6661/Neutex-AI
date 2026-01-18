// Railway as primary (as requested)
const RAILWAY_API_URL = 'https://neutexai-production-30f1.up.railway.app';
const LOCAL_API_URL = 'http://localhost:3001';

// Railway first (as you requested)
export const API_BASE_URL = RAILWAY_API_URL;

export const makeAPICall = async (endpoint, options = {}) => {
  const primaryURL = RAILWAY_API_URL;  // Railway first
  const fallbackURL = LOCAL_API_URL;   // Local as fallback

  try {
    console.log(`API Call (Railway): ${primaryURL}${endpoint}`);
    const response = await fetch(`${primaryURL}${endpoint}`, options);
    
    if (response.status < 500) {
      console.log(`Railway responded: ${response.status}`);
      return response;
    }
    
    throw new Error(`Railway server error: ${response.status}`);
  } catch (error) {
    console.warn(`Railway failed: ${error.message}`);
    console.log(`Trying local fallback...`);
    
    try {
      const fallbackResponse = await fetch(`${fallbackURL}${endpoint}`, options);
      
      if (fallbackResponse.ok || fallbackResponse.status < 500) {
        console.log(`Local fallback succeeded`);
        return fallbackResponse;
      }
      
      throw new Error(`Local fallback failed: ${fallbackResponse.status}`);
    } catch (fallbackError) {
      console.error('Both APIs failed');
      throw new Error(`All APIs unavailable. Railway: ${error.message}, Local: ${fallbackError.message}`);
    }
  }
};