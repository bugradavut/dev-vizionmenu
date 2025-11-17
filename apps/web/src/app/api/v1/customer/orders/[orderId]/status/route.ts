import { NextRequest, NextResponse } from 'next/server';

// Get backend API URL - fallback to local development
const getApiBaseUrl = () => {
  // Priority 1: Explicit API_BASE_URL from environment
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }

  // Priority 2: For Vercel deployments, derive backend URL from frontend URL
  if (process.env.VERCEL_URL && process.env.NODE_ENV === 'production') {
    const frontendUrl = process.env.VERCEL_URL;

    // If on dev-vizionmenu.vercel.app → use dev-vizionmenu-web.vercel.app
    if (frontendUrl.includes('dev-vizionmenu.vercel.app')) {
      return 'https://dev-vizionmenu-web.vercel.app';
    }

    // If on vizionmenu.app → use api.vizionmenu.app
    if (frontendUrl.includes('vizionmenu.app')) {
      return 'https://api.vizionmenu.app';
    }

    // For preview deployments, use same URL
    return `https://${frontendUrl}`;
  }

  // Priority 3: Local development fallback
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