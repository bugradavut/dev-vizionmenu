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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { dailyClosingService } from "@/services";
import type { DailyClosing, DailySummary } from "@/types";
import { format } from "date-fns";
import { Calendar, CheckCircle, XCircle, Clock, DollarSign, AlertTriangle } from "lucide-react";

export default function DailyClosingPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <DailyClosingContent />
      </DashboardLayout>
    </AuthGuard>
  );
}

function DailyClosingContent() {
  // State
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [currentClosing, setCurrentClosing] = useState<DailyClosing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cancel modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Load summary and check for existing closing
  useEffect(() => {
    loadDailySummary();
  }, [selectedDate]);

  async function loadDailySummary() {
    try {
      setLoading(true);
      setError(null);

      // Load summary
      const summaryResponse = await dailyClosingService.getDailySummary(selectedDate);
      if (summaryResponse.success && summaryResponse.data) {
        setSummary(summaryResponse.data.data);
      }

      // Check for existing closing
      const closingsResponse = await dailyClosingService.getDailyClosings({
        date_from: selectedDate,
        date_to: selectedDate,
        limit: 1,
      });

      if (closingsResponse.success && closingsResponse.data?.closings?.length > 0) {
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

      const response = await dailyClosingService.startDailyClosing({ date: selectedDate });

      if (response.success) {
        await loadDailySummary();
      } else {
        setError("Failed to start daily closing");
      }
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

      const response = await dailyClosingService.cancelDailyClosing(currentClosing.id, {
        reason: cancelReason || undefined,
      });

      if (response.success) {
        setCancelModalOpen(false);
        setCancelReason("");
        await loadDailySummary();
      } else {
        setError("Failed to cancel daily closing");
      }
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

      const response = await dailyClosingService.completeDailyClosing(currentClosing.id);

      if (response.success) {
        await loadDailySummary();
      } else {
        setError("Failed to complete daily closing");
      }
    } catch (err: any) {
      setError(err.message || "Failed to complete daily closing");
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "draft":
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Draft</Badge>;
      case "completed":
        return <Badge variant="default" className="flex items-center gap-1 bg-green-500"><CheckCircle className="h-3 w-3" /> Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Cancelled</Badge>;
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
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Closing</h1>
          <p className="text-muted-foreground">Quebec WEB-SRM Daily Closing Receipts (FER)</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Date Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="date">Closing Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
            <Button onClick={loadDailySummary} disabled={loading}>
              {loading ? "Loading..." : "Load Summary"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Daily Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Daily Summary - {format(new Date(selectedDate), "MMMM d, yyyy")}
            </CardTitle>
            <CardDescription>Sales and transaction summary for the selected date</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.total_sales)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Refunds</p>
                <p className="text-2xl font-bold text-red-500">-{formatCurrency(summary.total_refunds)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Net Sales</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.net_sales)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{summary.transaction_count}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">GST Collected</p>
                <p className="text-lg font-semibold">{formatCurrency(summary.gst_collected)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">QST Collected</p>
                <p className="text-lg font-semibold">{formatCurrency(summary.qst_collected)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Cash Total</p>
                <p className="text-lg font-semibold">{formatCurrency(summary.cash_total)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Card Total</p>
                <p className="text-lg font-semibold">{formatCurrency(summary.card_total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Closing Status */}
      {currentClosing ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Closing Status</span>
              {getStatusBadge(currentClosing.status)}
            </CardTitle>
            <CardDescription>
              {currentClosing.status === "draft" && "This closing is in draft status and can be completed or cancelled"}
              {currentClosing.status === "completed" && `Completed on ${format(new Date(currentClosing.completed_at!), "PPpp")}`}
              {currentClosing.status === "cancelled" && `Cancelled on ${format(new Date(currentClosing.cancelled_at!), "PPpp")}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Started At</p>
                <p className="font-medium">{format(new Date(currentClosing.started_at), "PPpp")}</p>
              </div>
              {currentClosing.websrm_transaction_id && (
                <div>
                  <p className="text-sm text-muted-foreground">WEB-SRM Transaction ID</p>
                  <p className="font-mono text-xs">{currentClosing.websrm_transaction_id}</p>
                </div>
              )}
            </div>

            {currentClosing.cancellation_reason && (
              <div>
                <p className="text-sm text-muted-foreground">Cancellation Reason</p>
                <p className="font-medium">{currentClosing.cancellation_reason}</p>
              </div>
            )}

            {currentClosing.status === "draft" && (
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCompleteClosing}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete & Send to WEB-SRM
                </Button>
                <Button
                  onClick={() => setCancelModalOpen(true)}
                  variant="destructive"
                  disabled={loading}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Closing
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        summary && summary.transaction_count > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Start Daily Closing</CardTitle>
              <CardDescription>
                No closing exists for this date. Start a new daily closing to prepare the FER transaction for WEB-SRM.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleStartClosing} disabled={loading}>
                <Clock className="h-4 w-4 mr-2" />
                Start Daily Closing
              </Button>
            </CardContent>
          </Card>
        )
      )}

      {/* Cancel Closing Modal - CRITICAL for FO-115 Step 2 */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Daily Closing</DialogTitle>
            <DialogDescription>
              SW-78 FO-115 Step 2: Cancel the entry of a new closing receipt before completion.
              This action will be logged for compliance purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Cancellation Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for cancelling this closing..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                This cancellation will be logged in the activity logs for audit purposes.
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
              Keep Closing
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelClosing}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling..." : "Cancel Closing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
