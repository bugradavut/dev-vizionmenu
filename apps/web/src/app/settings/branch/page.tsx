"use client"

import { useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, CheckCircle, Settings, Clock, Timer, Plus, Minus } from "lucide-react"

export default function BranchSettingsPage() {
  const [orderFlow, setOrderFlow] = useState<'standard' | 'simplified'>('standard')
  const [saved, setSaved] = useState(false)
  
  // Timing settings state
  const [baseDelay, setBaseDelay] = useState(20)
  const [temporaryBaseDelay, setTemporaryBaseDelay] = useState(0)
  const [deliveryDelay, setDeliveryDelay] = useState(15)
  const [temporaryDeliveryDelay, setTemporaryDeliveryDelay] = useState(0)
  const [manualReadyOption, setManualReadyOption] = useState(true)

  const handleSave = () => {
    // Mock save action
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collibible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard">
                      Dashboard
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/settings">
                      Settings
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Branch Settings</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col px-2 sm:px-4 lg:px-6">
            {/* Header Section */}
            <div className="px-2 py-6 sm:px-4 lg:px-6 bg-background">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <h1 className="text-3xl font-bold tracking-tight">Branch Settings</h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    Configure how your restaurant handles orders and workflows.
                  </p>
                </div>
                <div className="lg:col-span-4 flex items-center justify-end">
                  {/* Toast will be positioned fixed */}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-6">

                    {/* Order Flow Management Card */}
                    <Card className="group hover:shadow-lg transition-all duration-200">
                      <CardHeader className="pb-4 border-b mb-6">
                        <div className="flex items-center gap-3">
                          <Settings className="h-5 w-5 text-muted-foreground" />
                          <CardTitle className="text-lg">Order Management Flow</CardTitle>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Choose how your restaurant handles order progression
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        
                        {/* Standard Flow Option */}
                        <div 
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            orderFlow === 'standard' 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:bg-muted/50'
                          }`}
                          onClick={() => setOrderFlow('standard')}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-1 ${
                              orderFlow === 'standard' 
                                ? 'border-primary bg-primary' 
                                : 'border-muted-foreground/30'
                            }`}>
                              {orderFlow === 'standard' && (
                                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium mb-1">Standard Flow</h3>
                              <p className="text-sm text-muted-foreground mb-3">
                                Manually control each order status with full workflow flexibility
                              </p>
                              
                              {/* Flow Visualization */}
                              <div className="flex items-center gap-1 text-xs flex-wrap">
                                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">Pending</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Confirmed</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Preparing</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Ready</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Simplified Flow Option */}
                        <div 
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            orderFlow === 'simplified' 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:bg-muted/50'
                          }`}
                          onClick={() => setOrderFlow('simplified')}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-1 ${
                              orderFlow === 'simplified' 
                                ? 'border-primary bg-primary' 
                                : 'border-muted-foreground/30'
                            }`}>
                              {orderFlow === 'simplified' && (
                                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium mb-1">Simplified Flow</h3>
                              <p className="text-sm text-muted-foreground mb-3">
                                Automatic order acceptance with smart timing based on menu prep times
                              </p>
                              
                              {/* Flow Visualization */}
                              <div className="flex items-center gap-1 text-xs flex-wrap mb-3">
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Auto-accept</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Preparing</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Auto Ready</span>
                              </div>

                              {/* Smart Timing Info */}
                              <div className="bg-muted p-3 rounded text-xs text-muted-foreground">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="h-3 w-3" />
                                  <span className="font-medium">Smart Timing</span>
                                </div>
                                <p>Uses prep times from menu items • Defaults to 25 minutes • Takes longest item time for orders</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex items-center justify-between pt-4">
                          <div className="text-sm text-muted-foreground">
                            Currently using: <span className="font-medium">
                              {orderFlow === 'standard' ? 'Standard Flow' : 'Simplified Flow'}
                            </span>
                          </div>
                          <Button onClick={handleSave}>
                            Save Changes
                          </Button>
                        </div>

                      </CardContent>
                    </Card>

                </div>

                {/* Timing Settings - Always visible, disabled for Standard flow */}
                <div className="xl:col-span-6">
                  {/* Timing Settings Card */}
                  <Card className={`group transition-all duration-200 ${
                    orderFlow === 'simplified' 
                      ? 'hover:shadow-lg opacity-100' 
                      : 'opacity-60 pointer-events-none'
                  }`}>
                      <CardHeader className="pb-4 border-b mb-6">
                        <div className="flex items-center gap-3">
                          <Timer className="h-5 w-5 text-muted-foreground" />
                          <CardTitle className="text-lg">Preparation & Delivery Timing</CardTitle>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          {orderFlow === 'standard' ? 'Available only with Simplified Flow' : 'Configure general preparation times and delivery delays'}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        
                        {/* Base Delay Section */}
                        <div className="space-y-3">
                          <h3 className="font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            Base Preparation Delay
                          </h3>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="base-initial">Initial (Minutes)</Label>
                              <Input
                                id="base-initial"
                                type="number"
                                value={baseDelay}
                                onChange={(e) => setBaseDelay(Number(e.target.value))}
                                className="h-9"
                                min="0"
                                max="120"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="base-temporary">Temporary (+/-)</Label>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setTemporaryBaseDelay(Math.max(-60, temporaryBaseDelay - 5))}
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  id="base-temporary"
                                  type="number"
                                  value={temporaryBaseDelay}
                                  onChange={(e) => setTemporaryBaseDelay(Number(e.target.value))}
                                  className="h-8 text-center text-sm"
                                  min="-60"
                                  max="60"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setTemporaryBaseDelay(Math.min(60, temporaryBaseDelay + 5))}
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-primary/5 p-2 rounded text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Total:</span>
                              <span className="font-medium text-primary">{baseDelay + temporaryBaseDelay} min</span>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Delivery Delay Section */}
                        <div className="space-y-3">
                          <h3 className="font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            Delivery Delay
                          </h3>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="delivery-initial">Initial (Minutes)</Label>
                              <Input
                                id="delivery-initial"
                                type="number"
                                value={deliveryDelay}
                                onChange={(e) => setDeliveryDelay(Number(e.target.value))}
                                className="h-9"
                                min="0"
                                max="120"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="delivery-temporary">Temporary (+/-)</Label>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setTemporaryDeliveryDelay(Math.max(-60, temporaryDeliveryDelay - 5))}
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  id="delivery-temporary"
                                  type="number"
                                  value={temporaryDeliveryDelay}
                                  onChange={(e) => setTemporaryDeliveryDelay(Number(e.target.value))}
                                  className="h-8 text-center text-sm"
                                  min="-60"
                                  max="60"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setTemporaryDeliveryDelay(Math.min(60, temporaryDeliveryDelay + 5))}
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-primary/5 p-2 rounded text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Total:</span>
                              <span className="font-medium text-primary">{Math.max(0, deliveryDelay + temporaryDeliveryDelay)} min</span>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Expected Total Delivery Time */}
                        <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-primary" />
                              <h3 className="font-medium text-primary">Expected Total Time</h3>
                            </div>
                            <p className="text-xl font-bold text-primary">
                              {Math.max(0, baseDelay + temporaryBaseDelay + deliveryDelay + temporaryDeliveryDelay)} MIN
                            </p>
                          </div>
                        </div>

                        {/* Manual Ready Option for Simplified Flow */}
                        {orderFlow === 'simplified' && (
                          <>
                            <Separator />
                            <div 
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                manualReadyOption 
                                  ? 'border-primary bg-primary/5' 
                                  : 'border-border hover:bg-muted/50'
                              }`}
                              onClick={() => setManualReadyOption(!manualReadyOption)}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                                  manualReadyOption 
                                    ? 'border-primary bg-primary' 
                                    : 'border-muted-foreground/30'
                                }`}>
                                  {manualReadyOption && (
                                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium">Allow Manual &quot;Ready&quot; Button</h4>
                                  <p className="text-xs text-muted-foreground">
                                    Staff can mark orders ready before auto-timer expires
                                  </p>
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                      </CardContent>
                    </Card>

                  </div>

              </div>
            </div>
          </div>
          
          {/* Modern Toast Notification */}
          {saved && (
            <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
              <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 flex items-center gap-3">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900">Settings saved successfully!</p>
                  <p className="text-xs text-green-700 mt-1">Your order flow preferences have been updated.</p>
                </div>
                <button 
                  onClick={() => setSaved(false)}
                  className="flex-shrink-0 text-green-600 hover:text-green-800 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}