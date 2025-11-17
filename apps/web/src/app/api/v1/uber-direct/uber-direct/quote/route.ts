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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('🧪 Uber Direct Public Quote - API_BASE_URL:', API_BASE_URL);

    const response = await fetch(`${API_BASE_URL}/api/v1/uber-direct/uber-direct/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Uber Direct Quote error:', response.status, data);
      return NextResponse.json(data, { status: response.status });
    }

    console.log('✅ Uber Direct Quote success:', data);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('❌ Uber Direct Quote proxy error:', error);
    return NextResponse.json(
      { error: { code: 'PROXY_ERROR', message: 'Failed to get delivery quote' } },
      { status: 500 }
    );
  }
}