import { NextRequest, NextResponse } from 'next/server';

// Get backend API URL - fallback to local development
const getApiBaseUrl = () => {
  // For production/dev environments
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  
  // For Vercel deployments, check if we're on the frontend deployment
  if (process.env.VERCEL_URL && process.env.NODE_ENV === 'production') {
    // If we're on dev-vizionmenu.vercel.app (frontend), use backend URL
    if (process.env.VERCEL_URL.includes('dev-vizionmenu.vercel.app')) {
      return 'https://dev-vizionmenu-web.vercel.app';
    }
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Local development fallback
  return 'http://localhost:3001';
};

const API_BASE_URL = getApiBaseUrl();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    console.log('Customer order status request for orderId:', orderId);
    console.log('API_BASE_URL:', API_BASE_URL); // Debug log
    
    const response = await fetch(`${API_BASE_URL}/api/v1/customer/orders/${orderId}/status`);
    const data = await response.json();

    if (!response.ok) {
      console.error('Backend API error:', response.status, data); // Debug log
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error); // Debug log
    return NextResponse.json(
      { error: { code: 'PROXY_ERROR', message: 'Failed to process request' } },
      { status: 500 }
    );
  }
}