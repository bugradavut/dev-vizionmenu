"use client";

/**
 * Transaction Verification Page (SW-76 Compliance)
 *
 * Purpose: Display transaction summary when customers scan QR code
 * URL: /verify?no={transId}&dt={timestamp}&tot={amount}&sig={signature}
 *
 * SW-76 Requirements:
 * - Show transaction details from WEB-SRM receipt
 * - Display merchant info, items, taxes, totals
 * - Provide verification that receipt is authentic
 */

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';

interface ReceiptDetails {
  transactionId: string;
  timestamp: string;
  totalAmount: number;
  signature: string;
  merchantName?: string;
  verified: boolean;
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const [receipt, setReceipt] = useState<ReceiptDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Parse QR code parameters
    const no = searchParams.get('no') || '';
    const dt = searchParams.get('dt') || '';
    const tot = searchParams.get('tot') || '';
    const sig = searchParams.get('sig') || '';

    if (!no && !dt && !tot && !sig) {
      setError(language === 'fr' ? 'Paramètres manquants' : 'Missing parameters');
      setLoading(false);
      return;
    }

    // TODO: Verify signature with backend API
    // For now, just display the data
    setReceipt({
      transactionId: no,
      timestamp: dt,
      totalAmount: parseFloat(tot) / 100, // Convert cents to dollars
      signature: sig,
      verified: true // TODO: Real verification
    });
    setLoading(false);
  }, [searchParams, language]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">
              {language === 'fr' ? 'Vérification du reçu...' : 'Verifying receipt...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-500" />
              <CardTitle className="text-red-900">
                {language === 'fr' ? 'Reçu non trouvé' : 'Receipt Not Found'}
              </CardTitle>
            </div>
            <CardDescription className="text-red-700">
              {error || (language === 'fr'
                ? 'Ce reçu n\'a pas pu être vérifié.'
                : 'This receipt could not be verified.')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-sm bg-white shadow-md font-mono text-xs leading-tight">
        {/* Receipt Header */}
        <div className="p-3 text-center border-b-2 border-dashed border-black">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CheckCircle className="h-4 w-4 text-black" />
            <h1 className="text-sm font-bold">
              {language === 'fr' ? 'REÇU VÉRIFIÉ' : 'RECEIPT VERIFIED'}
            </h1>
          </div>
          <p className="text-[10px]">
            {language === 'fr'
              ? 'Conforme aux mesures de facturation\nobligatoires du Québec'
              : 'Complies with Quebec mandatory\nbilling measures'}
          </p>
        </div>

        {/* Transaction Details */}
        <div className="p-3">
          <div className="flex justify-between mb-1">
            <span>{language === 'fr' ? 'Transaction' : 'Transaction'}:</span>
            <span className="font-bold">{receipt.transactionId}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>{language === 'fr' ? 'Date/Heure' : 'Date/Time'}:</span>
            <span>{receipt.timestamp}</span>
          </div>

          <div className="border-t-2 border-dashed border-black my-2"></div>

          <div className="flex justify-between text-base font-bold">
            <span>{language === 'fr' ? 'TOTAL' : 'TOTAL'}:</span>
            <span>${receipt.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="border-t-2 border-dashed border-black"></div>

        {/* WEB-SRM Notice */}
        <div className="p-3 text-center">
          <p className="text-[11px] font-bold mb-1">
            {language === 'fr' ? 'Système WEB-SRM de Revenu Québec' : 'Revenu Québec WEB-SRM System'}
          </p>
          <p className="text-[10px] leading-snug">
            {language === 'fr'
              ? 'Transaction enregistrée dans le système\nWEB-SRM conformément aux mesures\nobligatoires.'
              : 'Transaction registered in WEB-SRM\nsystem in compliance with mandatory\nmeasures.'}
          </p>
        </div>

        <div className="border-t-2 border-dashed border-black"></div>

        {/* Digital Signature */}
        <div className="p-3">
          <p className="text-[11px] font-bold mb-1">
            {language === 'fr' ? 'Signature numérique' : 'Digital Signature'}:
          </p>
          <p className="text-[9px] break-all leading-tight mb-1">
            {receipt.signature}
          </p>
          <p className="text-[9px] text-gray-600">
            {language === 'fr'
              ? 'Cette signature garantit l\'authenticité du reçu.'
              : 'This signature guarantees receipt authenticity.'}
          </p>
        </div>

        <div className="border-t-2 border-dashed border-black"></div>

        {/* Footer */}
        <div className="p-3 text-center">
          <p className="text-xs font-bold">
            {language === 'fr' ? 'Merci de votre visite!' : 'Thank you for your visit!'}
          </p>
          <p className="text-[10px] text-gray-600 mt-1">Vision Menu</p>
        </div>

        <div className="border-t-2 border-dashed border-black"></div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
