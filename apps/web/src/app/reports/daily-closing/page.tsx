"use client";

/**
 * Daily Closing Page
 * SW-78 FO-115: Quebec WEB-SRM Daily Closing Receipts (FER)
 *
 * Features:
 * - View daily summary for a specific date
 * - Start a new daily closing (draft)
 * - Cancel a closing before completion (FO-115 Step 2 - CRITICAL)
 * - Complete a closing and send to WEB-SRM
 */

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { DashboardLayout } from "@/components/dashboard-layout";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { dailyClosingService } from "@/services";
import type { DailyClosing, DailySummary } from "@/types";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Receipt,
  Store,
  Globe,
  TrendingUp
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

export default function DailyClosingPage() {
  return (
    <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
      <DashboardLayout>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <DynamicBreadcrumb />
            </div>
          </header>
          <DailyClosingContent />
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  );
}

function DailyClosingContent() {
  const { language } = useLanguage();

  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [currentClosing, setCurrentClosing] = useState<DailyClosing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Cancel modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const t = {
    title: language === 'fr' ? 'Clôture Journalière' : 'Daily Closing',
    subtitle: language === 'fr' ? 'Clôtures de caisse quotidiennes WEB-SRM (FER)' : 'Quebec WEB-SRM Daily Closing Receipts (FER)',
    selectDate: language === 'fr' ? 'Sélectionner la Date' : 'Select Date',
    loadSummary: language === 'fr' ? 'Charger le Résumé' : 'Load Summary',
    loading: language === 'fr' ? 'Chargement...' : 'Loading...',
    totalSales: language === 'fr' ? 'Ventes Totales' : 'Total Sales',
    netSales: language === 'fr' ? 'Ventes Nettes' : 'Net Sales',
    transactions: language === 'fr' ? 'Transactions' : 'Transactions',
    taxes: language === 'fr' ? 'Taxes Collectées' : 'Taxes Collected',
    atRegister: language === 'fr' ? 'Paiement à la Caisse' : 'Payment at Counter',
    online: language === 'fr' ? 'Paiement en Ligne' : 'Online Payment',
    refunds: language === 'fr' ? 'Remboursements' : 'Refunds',
    paymentSources: language === 'fr' ? 'Sources de Paiement' : 'Payment Sources',
    status: language === 'fr' ? 'Statut' : 'Status',
    draft: language === 'fr' ? 'Brouillon' : 'Draft',
    completed: language === 'fr' ? 'Complété' : 'Completed',
    cancelled: language === 'fr' ? 'Annulé' : 'Cancelled',
    startClosing: language === 'fr' ? 'Démarrer la Clôture' : 'Start Daily Closing',
    completeClosing: language === 'fr' ? 'Compléter & Envoyer' : 'Complete & Send to WEB-SRM',
    cancelClosing: language === 'fr' ? 'Annuler la Clôture' : 'Cancel Closing',
    cancelTitle: language === 'fr' ? 'Annuler la Clôture Journalière' : 'Cancel Daily Closing',
    cancelDesc: language === 'fr'
      ? 'Êtes-vous sûr de vouloir annuler cette clôture? Cette action sera enregistrée dans les journaux d\'audit.'
      : 'Are you sure you want to cancel this closing? This action will be recorded in the audit logs.',
    cancelReason: language === 'fr' ? 'Raison de l\'Annulation (Optionnel)' : 'Cancellation Reason (Optional)',
    cancelReasonPlaceholder: language === 'fr' ? 'Entrez la raison de l\'annulation...' : 'Enter the reason for cancelling...',
    goBack: language === 'fr' ? 'Retour' : 'Go Back',
    confirmCancel: language === 'fr' ? 'Oui, Annuler' : 'Yes, Cancel',
    cancelling: language === 'fr' ? 'Annulation...' : 'Cancelling...',
    noData: language === 'fr' ? 'Aucune donnée pour cette date' : 'No data for this date',
    startDesc: language === 'fr'
      ? 'Aucune clôture n\'existe pour cette date. Démarrer une nouvelle clôture pour préparer la transaction FER pour WEB-SRM.'
      : 'No closing exists for this date. Start a new daily closing to prepare the FER transaction for WEB-SRM.',
  };

  // Load summary and check for existing closing
  useEffect(() => {
    if (selectedDate) {
      loadDailySummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  async function loadDailySummary() {
    try {
      setLoading(true);
      setError(null);

      const dateStr = format(selectedDate, "yyyy-MM-dd");

      // Load summary
      const summaryResponse = await dailyClosingService.getDailySummary(dateStr);
      setSummary(summaryResponse.data);

      // Check for existing closing
      const closingsResponse = await dailyClosingService.getDailyClosings({
        date_from: dateStr,
        date_to: dateStr,
        limit: 1,
      });

      if (closingsResponse.data?.closings?.length > 0) {
        setCurrentClosing(closingsResponse.data.closings[0]);
      } else {
        setCurrentClosing(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load daily summary");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartClosing() {
    try {
      setLoading(true);
      setError(null);

      const dateStr = format(selectedDate, "yyyy-MM-dd");
      await dailyClosingService.startDailyClosing({ date: dateStr });
      await loadDailySummary();
    } catch (err: any) {
      setError(err.message || "Failed to start daily closing");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelClosing() {
    if (!currentClosing) return;

    try {
      setCancelling(true);
      setError(null);

      await dailyClosingService.cancelDailyClosing(currentClosing.id, {
        reason: cancelReason || undefined,
      });

      setCancelModalOpen(false);
      setCancelReason("");
      await loadDailySummary();
    } catch (err: any) {
      setError(err.message || "Failed to cancel daily closing");
    } finally {
      setCancelling(false);
    }
  }

  async function handleCompleteClosing() {
    if (!currentClosing) return;

    try {
      setLoading(true);
      setError(null);

      await dailyClosingService.completeDailyClosing(currentClosing.id);
      await loadDailySummary();
    } catch (err: any) {
      setError(err.message || "Failed to complete daily closing");
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "draft":
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t.draft}</Badge>;
      case "completed":
        return <Badge variant="default" className="flex items-center gap-1 text-green-700 border-green-500 bg-green-100"><CheckCircle className="h-3 w-3" /> {t.completed}</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="flex items-center gap-1 text-red-700 border-red-300 bg-red-100"><XCircle className="h-3 w-3" /> {t.cancelled}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  }

  return (
    <div className="flex flex-1 flex-col px-2 sm:px-4 lg:px-6 max-w-full overflow-hidden">
      {/* Header */}
      <div className="px-2 py-6 sm:px-4 lg:px-6 bg-background">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
            <p className="text-muted-foreground mt-2 text-lg">{t.subtitle}</p>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-2">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-64 justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "MMMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setCalendarOpen(false);
                    }
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className="rounded-lg border shadow-sm"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6 max-w-full overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-foreground">{t.loading}</p>
              <p className="text-sm text-muted-foreground">
                {language === 'fr' ? 'Veuillez patienter...' : 'Please wait...'}
              </p>
            </div>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-sm text-red-600">{error}</CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Metrics Cards - Daily Summary */}
            {summary && (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Sales */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t.totalSales}</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.total_sales)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.refunds}: -{formatCurrency(summary.total_refunds)}
                    </p>
                  </CardContent>
                </Card>

                {/* Net Sales */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t.netSales}</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.net_sales)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary.transaction_count} {t.transactions}
                    </p>
                  </CardContent>
                </Card>

                {/* Taxes */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t.taxes}</CardTitle>
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(summary.gst_collected + summary.qst_collected)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      GST: {formatCurrency(summary.gst_collected)} | QST: {formatCurrency(summary.qst_collected)}
                    </p>
                  </CardContent>
                </Card>

                {/* Payment Sources */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t.paymentSources}</CardTitle>
                    <Store className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-1">
                          <Store className="h-3 w-3" /> {t.atRegister}
                        </span>
                        <span className="text-sm font-medium">{formatCurrency(summary.terminal_total)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-1">
                          <Globe className="h-3 w-3" /> {t.online}
                        </span>
                        <span className="text-sm font-medium">{formatCurrency(summary.online_total)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Status and Actions Card */}
            {currentClosing ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">{t.status}</h3>
                    {getStatusBadge(currentClosing.status)}
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1 mb-3">
                    <p>{language === 'fr' ? 'Démarré' : 'Started'}: {format(new Date(currentClosing.started_at), "PPp")}</p>
                    {currentClosing.completed_at && (
                      <p>{language === 'fr' ? 'Complété' : 'Completed'}: {format(new Date(currentClosing.completed_at), "PPp")}</p>
                    )}
                    {currentClosing.cancelled_at && (
                      <p>{language === 'fr' ? 'Annulé' : 'Cancelled'}: {format(new Date(currentClosing.cancelled_at), "PPp")}</p>
                    )}
                    {currentClosing.websrm_transaction_id && (
                      <p className="font-mono text-xs">ID: {currentClosing.websrm_transaction_id}</p>
                    )}
                  </div>

                  {currentClosing.cancellation_reason && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded mb-3">
                      <p className="text-xs text-red-700">{currentClosing.cancellation_reason}</p>
                    </div>
                  )}

                  {currentClosing.status === "draft" && (
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={() => setCancelModalOpen(true)}
                        variant="outline"
                        disabled={loading}
                        size="sm"
                      >
                        {t.cancelClosing}
                      </Button>
                      <Button
                        onClick={handleCompleteClosing}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        {t.completeClosing}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              summary && summary.transaction_count > 0 && (
                <Card className="border-2 border-dashed">
                  <CardHeader>
                    <CardTitle className="text-xl">{t.startClosing}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{t.startDesc}</p>
                    <Button onClick={handleStartClosing} disabled={loading} size="lg">
                      <Clock className="h-4 w-4 mr-2" />
                      {t.startClosing}
                    </Button>
                  </CardContent>
                </Card>
              )
            )}

            {summary && summary.transaction_count === 0 && !currentClosing && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t.noData}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Cancel Closing Modal - CRITICAL for FO-115 Step 2 */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.cancelTitle}</DialogTitle>
            <DialogDescription>{t.cancelDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">{t.cancelReason}</Label>
              <Textarea
                id="reason"
                placeholder={t.cancelReasonPlaceholder}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                {language === 'fr'
                  ? 'Cette annulation sera enregistrée dans les journaux d\'activité à des fins d\'audit.'
                  : 'This cancellation will be logged in the activity logs for audit purposes.'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelModalOpen(false);
                setCancelReason("");
              }}
              disabled={cancelling}
            >
              {t.goBack}
            </Button>
            <Button
              onClick={handleCancelClosing}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {cancelling ? t.cancelling : t.confirmCancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
