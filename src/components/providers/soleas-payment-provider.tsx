import { useState } from 'react';

export const createSoleasPayment = async (amount: number, currency: string, shopName = 'DRAVA') => {
  try {
    // Create a payment intent with Soleas
    const response = await fetch(`${process.env.NEXT_PUBLIC_SOLEAS_API_URL}/payment-intents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SOLEAS_API_KEY}`,
      },
      body: JSON.stringify({
        amount,
        currency,
        shopName,
        description: 'Card payment on DRAVA',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create payment intent');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

export const useSoleasPayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createPayment = async (amount: number, currency: string, shopName = 'DRAVA') => {
    setLoading(true);
    setError(null);
    try {
      const paymentIntent = await createSoleasPayment(amount, currency, shopName);
      return paymentIntent;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { createPayment, loading, error };
};