# DEV ENV Configuration for WEB-SRM
# Activity Sector: RBC (Restaurant, Bar, Café)

$env:WEBSRM_ENV="DEV"
$env:WEBSRM_ENABLED="true"
$env:WEBSRM_NETWORK_ENABLED="true"
$env:WEBSRM_DB_ALLOW_WRITE="true"
$env:NODE_ENV="development"

# Supabase Configuration
$env:SUPABASE_URL="https://hfaqldkvnefjerosndxr.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmYXFsZGt2bmVmamVyb3NuZHhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY2MTA5OSwiZXhwIjoyMDY4MjM3MDk5fQ.Y3mlDpcWtDkTqEXReCvJ5SbvcFobUsNoOzSJ4U8uR6A"
$env:WEBSRM_ENCRYPTION_KEY="6d944a1c52137101a4a45b091c121260ff0fe5a54cb59d54d59cd53928d9c9c1"

# DEV Credentials (RBC - Restaurant, Bar, Café)
$env:WEBSRM_DEV_DEVICE_ID="0000-0000-0000"
$env:WEBSRM_DEV_PARTNER_ID="0000000000001FF2"
$env:WEBSRM_DEV_CERT_CODE="FOB201999999"
$env:WEBSRM_DEV_AUTH_CODE="D8T8-W8W8"
$env:WEBSRM_DEV_IDSEV="0000000000003973"
$env:WEBSRM_DEV_IDVERSI="00000000000045D6"
$env:WEBSRM_DEV_VERSI="0.1.0"
$env:WEBSRM_DEV_ACTIVITY_SECTOR="RBC"

# DEV CSR Subject (per RQ template)
# DN: C=CA, ST=QC, L=-05:00, SN=Certificat du serveur, O=RBC-D8T8-W8W8, OU=5678912340TQ0001, GN=ER0001, CN=5678912340
$env:WEBSRM_DEV_CSR_CN="5678912340"
$env:WEBSRM_DEV_CSR_OU="5678912340TQ0001"
$env:WEBSRM_DEV_CSR_GN="ER0001"

Write-Host "✅ DEV ENV variables set successfully" -ForegroundColor Green
Write-Host ""
Write-Host "Activity Sector: RBC (Restaurant, Bar, Café)" -ForegroundColor Cyan
Write-Host "Authorization Code: D8T8-W8W8" -ForegroundColor Cyan
Write-Host ""
Write-Host "To run commands in this session:"
Write-Host "  pnpm websrm:enrolment:dev     # Run DEV enrolment"
Write-Host "  pnpm websrm:test:dev          # Run DEV test cases"
Write-Host ""
