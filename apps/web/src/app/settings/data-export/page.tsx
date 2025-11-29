'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { AppSidebar } from '@/components/app-sidebar';
import { DynamicBreadcrumb } from '@/components/dynamic-breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useLanguage } from '@/contexts/language-context';
import { dataExportService } from '@/services/data-export.service';
import { Download, CheckCircle2, Loader2, Database, FileJson, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DataExportPage() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const isEnglish = language === 'en';

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      await dataExportService.exportAndDownloadData();

      setExportSuccess(true);

      toast({
        title: isEnglish ? 'Export Successful' : 'Exportation réussie',
        description: isEnglish
          ? 'Your data has been exported successfully.'
          : 'Vos données ont été exportées avec succès.',
        variant: 'default',
      });

      // Reset success message after 5 seconds
      setTimeout(() => {
        setExportSuccess(false);
      }, 5000);
    } catch (error) {
      console.error('[Data Export] Error:', error);

      toast({
        title: isEnglish ? 'Export Failed' : 'Échec de l\'exportation',
        description: error instanceof Error
          ? error.message
          : (isEnglish ? 'Failed to export data. Please try again.' : 'Échec de l\'exportation des données. Veuillez réessayer.'),
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

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

          <div className="flex flex-1 flex-col px-2 sm:px-4 lg:px-6">
            {/* Header Section */}
            <div className="px-2 py-6 sm:px-4 lg:px-6 bg-background">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {isEnglish ? 'Data Export' : 'Exportation de Données'}
                  </h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    {isEnglish
                      ? 'Download a complete copy of your branch data for compliance and backup.'
                      : 'Téléchargez une copie complète de vos données de succursale pour la conformité.'}
                  </p>
                </div>
                <div className="lg:col-span-4 flex items-center justify-end">
                  <Button
                    onClick={handleExport}
                    disabled={isExporting}
                    size="lg"
                    className="gap-2 px-8 hover:opacity-90 transition-opacity"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isEnglish ? 'Exporting...' : 'Exportation...'}
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        {isEnglish ? 'Download Data' : 'Télécharger'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6">
              <div className="space-y-6">

                {/* Success Message */}
                {exportSuccess && (
                  <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertTitle className="text-green-900 dark:text-green-100">
                      {isEnglish ? 'Export Successful!' : 'Exportation réussie !'}
                    </AlertTitle>
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      {isEnglish
                        ? 'Your data has been downloaded successfully. Check your downloads folder.'
                        : 'Vos données ont été téléchargées avec succès. Vérifiez votre dossier de téléchargements.'}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Grid Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* What's Included Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <Database className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {isEnglish ? 'What\'s Included' : 'Contenu'}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {isEnglish ? 'Exported data categories' : 'Catégories de données exportées'}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                          <span>{isEnglish ? 'Orders & items' : 'Commandes'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                          <span>{isEnglish ? 'WEB-SRM transactions' : 'Transactions WEB-SRM'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                          <span>{isEnglish ? 'Activity logs' : 'Journaux d\'activité'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                          <span>{isEnglish ? 'Offline events' : 'Événements hors ligne'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Format Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                          <FileJson className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {isEnglish ? 'File Format' : 'Format'}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {isEnglish ? 'Export file structure' : 'Structure du fichier'}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                          <span><span className="font-medium text-foreground">ZIP</span> {isEnglish ? 'archive' : 'archive'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                          <span><span className="font-medium text-foreground">JSON</span> {isEnglish ? 'files' : 'fichiers'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                          <span>{isEnglish ? 'README.txt with instructions' : 'README.txt avec instructions'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Privacy Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                          <Shield className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {isEnglish ? 'Privacy & Security' : 'Confidentialité et sécurité'}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {isEnglish ? 'Data protection compliance' : 'Conformité à la protection des données'}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                          <span>{isEnglish ? 'Only your branch data included' : 'Seules vos données de succursale'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                          <span>{isEnglish ? 'Other operators\' data excluded' : 'Données des autres opérateurs exclues'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                          <span>{isEnglish ? 'Complete audit trail included' : 'Piste d\'audit complète incluse'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  );
}
