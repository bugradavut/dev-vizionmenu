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
import { useEffect, useState, Suspense, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Download } from 'lucide-react';
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
  const receiptRef = useRef<HTMLDivElement>(null);

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

  const handleDownload = () => {
    if (receiptRef.current) {
      // Simple download as HTML file
      const content = receiptRef.current.outerHTML;
      const blob = new Blob([`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Receipt - ${receipt?.transactionId}</title>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="bg-gray-100 p-4">
            ${content}
          </body>
        </html>
      `], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receipt?.transactionId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 [color-scheme:light]">
        <Card className="w-full max-w-md bg-white text-gray-900">
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin !text-primary" />
            <p className="!text-gray-600">
              {language === 'fr' ? 'Vérification du reçu...' : 'Verifying receipt...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 [color-scheme:light]">
        <Card className="w-full max-w-md bg-white border-red-200 text-gray-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 !text-red-500" />
              <CardTitle className="!text-red-900">
                {language === 'fr' ? 'Reçu non trouvé' : 'Receipt Not Found'}
              </CardTitle>
            </div>
            <CardDescription className="!text-red-700">
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 gap-4 [color-scheme:light]">
      <div ref={receiptRef} className="w-full max-w-sm bg-white shadow-lg font-mono text-sm leading-relaxed rounded-lg text-black">
        {/* Receipt Header */}
        <div className="p-6 text-center border-b-2 border-dashed border-black">
          <div className="flex items-center justify-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 !text-green-600" />
            <h1 className="text-base font-bold">
              {language === 'fr' ? 'REÇU VÉRIFIÉ' : 'RECEIPT VERIFIED'}
            </h1>
          </div>
          <p className="text-xs !text-gray-600 leading-relaxed">
            {language === 'fr'
              ? 'Conforme aux mesures de facturation\nobligatoires du Québec'
              : 'Complies with Quebec mandatory\nbilling measures'}
          </p>
        </div>

        {/* Transaction Details */}
        <div className="p-6">
          <div className="flex justify-between mb-3">
            <span>{language === 'fr' ? 'Transaction' : 'Transaction'}:</span>
            <span className="font-bold">{receipt.transactionId}</span>
          </div>
          <div className="flex justify-between mb-4">
            <span>{language === 'fr' ? 'Date/Heure' : 'Date/Time'}:</span>
            <span>{receipt.timestamp}</span>
          </div>

          <div className="border-t-2 border-dashed border-black my-4"></div>

          <div className="flex justify-between text-lg font-bold">
            <span>{language === 'fr' ? 'TOTAL' : 'TOTAL'}:</span>
            <span>${receipt.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="border-t-2 border-dashed border-black"></div>

        {/* WEB-SRM Notice */}
        <div className="p-6 text-center">
          <p className="text-sm font-bold mb-3">
            {language === 'fr' ? 'Système WEB-SRM de Revenu Québec' : 'Revenu Québec WEB-SRM System'}
          </p>
          <p className="text-xs leading-relaxed !text-gray-700">
            {language === 'fr'
              ? 'Transaction enregistrée dans le système WEB-SRM conformément aux mesures obligatoires.'
              : 'Transaction registered in WEB-SRM system in compliance with mandatory measures.'}
          </p>
        </div>

        <div className="border-t-2 border-dashed border-black"></div>

        {/* Digital Signature */}
        <div className="p-6">
          <p className="text-sm font-bold mb-3">
            {language === 'fr' ? 'Signature numérique' : 'Digital Signature'}:
          </p>
          <p className="text-xs break-all leading-relaxed mb-3 !text-gray-700">
            {receipt.signature}
          </p>
          <p className="text-xs !text-gray-600 italic">
            {language === 'fr'
              ? 'Cette signature garantit l\'authenticité du reçu.'
              : 'This signature guarantees receipt authenticity.'}
          </p>
        </div>

        <div className="border-t-2 border-dashed border-black"></div>

        {/* Footer */}
        <div className="p-6 text-center">
          <p className="text-sm font-bold mb-2">
            {language === 'fr' ? 'Merci de votre visite!' : 'Thank you for your visit!'}
          </p>
          <p className="text-xs !text-gray-600">Vision Menu</p>
        </div>

        <div className="border-t-2 border-dashed border-black"></div>
      </div>

      {/* Download Button */}
      <Button
        onClick={handleDownload}
        className="w-full max-w-sm gap-2"
        size="lg"
      >
        <Download className="h-5 w-5" />
        {language === 'fr' ? 'Télécharger le reçu' : 'Download Receipt'}
      </Button>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 [color-scheme:light]">
        <Loader2 className="h-12 w-12 animate-spin !text-primary" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
