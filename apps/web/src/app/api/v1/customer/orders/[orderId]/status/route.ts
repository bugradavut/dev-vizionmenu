import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    console.log('Customer order status request for orderId:', orderId);
    
    const response = await fetch(`${API_BASE_URL}/api/v1/customer/orders/${orderId}/status`);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: { code: 'PROXY_ERROR', message: 'Failed to process request' } },
      { status: 500 }
    );
  }
}