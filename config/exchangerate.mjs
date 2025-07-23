
import fetch from 'node-fetch';

export const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/pair/${fromCurrency}/${toCurrency}/${amount}`
    );
    const data = await response.json();
    if (data.result === 'success') {
      return data.conversion_result;
    }
    throw new Error('Erreur lors de la conversion');
  } catch (error) {
    console.error('Erreur de conversion:', error);
    return amount; // Fallback au montant initial
  }
};