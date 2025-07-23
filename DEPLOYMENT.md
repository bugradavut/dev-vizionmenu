# Deployment Workflow

Bu dokümantasyon, geliştirme ve production deployment sürecini açıklar.

## 🏗️ Repository Setup

Projede 2 farklı repository kullanıyoruz:

- **Development Repository**: `https://github.com/bugradavut/dev-vizionmenu.git`
  - Geliştirme ve test işlemleri
  - Vercel'de otomatik deploy: `dev-vizionmenu.vercel.app`
  
- **Company Repository**: `https://github.com/vizionmenu/Food-Ordering-System.git`
  - Production kodları
  - Sadece test edilmiş, stabil kodlar

## 🏗️ Backend Architecture

Projede **unified Express.js backend** yapısı kullanılmaktadır:

### Unified Development & Production Backend
- **Framework**: Express.js
- **Local Port**: 3001 
- **Local Command**: `npm run dev` → `node api/index.js`
- **Production Platform**: Vercel Serverless Functions (same codebase)
- **File**: `apps/api/api/index.js`
- **Avantajlar**: 
  - Production-dev parity (aynı kod her yerde)
  - Simple debugging ve maintenance
  - Fast deployment, zero-config
  - Single codebase to maintain

### Architecture Benefits
- **What you develop is what you deploy**: Local'de test ettiğin kod aynen production'a çıkar
- **Consistent response format**: `{data: ..., meta: ...}` format'ı unified
- **Same database**: Aynı Supabase instance kullanır
- **No sync needed**: Tek codebase, tek endpoint set

## 🔄 Development Workflow

### 1. Normal Development

```bash
# Feature geliştirme
git add .
git commit -m "feat: new authentication system"
git push origin main
```

Her push sonrası:
- Frontend: `dev-vizionmenu.vercel.app` 
- Backend: `dev-vizionmenu-web.vercel.app`

**⚠️ ÖNEMLİ**: Vercel'de environment variables set edilmelidir:

### 2. Testing Phase

- Vercel dev sitesinde tüm feature'ları test edin
- Manual testing yapın
- Bug varsa düzeltip tekrar push edin

### 3. Production Deployment

Stabil olduğuna emin olduğunuzda:

#### Manuel Yöntem:
```bash
# Şirket reposuna gönder
git push company main
```

#### Otomatik Script (Önerilen):
```powershell
# Windows PowerShell
.\deploy-to-company.ps1 "v1.2.0 - Authentication system ready"
```

## 📦 Scripts

### PowerShell Script (`deploy-to-company.ps1`)

Otomatik deployment script'i şunları yapar:

1. ✅ Main branch'e geçer
2. ✅ Origin'den güncel kodları çeker  
3. ✅ Uncommitted değişiklik kontrolü
4. ✅ Test'leri çalıştırır
5. ✅ Build işlemini yapar
6. ✅ Company repo'suna gönderir

### Kullanım:
```powershell
.\deploy-to-company.ps1 "Release v1.2.0"
```

## 🚨 Önemli Notlar

### ⚠️ Asla Direkt Company Repo'da Değişiklik Yapmayın
- Tüm geliştirmeler dev repo'da yapılmalı
- Company repo sadece stabil kod almalı

### ✅ Deployment Öncesi Checklist
- [ ] Tüm feature'lar dev sitesinde test edildi
- [ ] Build hataları yok
- [ ] Test'ler geçiyor
- [ ] Commit message'lar açıklayıcı
- [ ] Breaking change'ler dokümante edildi

### 🔄 Hotfix Workflow
Acil düzeltmeler için:

```bash
# Hotfix branch oluştur
git checkout -b hotfix/critical-bug-fix

# Düzeltmeyi yap
git add .
git commit -m "hotfix: critical payment bug"

# Origin'e gönder ve test et
git push origin hotfix/critical-bug-fix

# Test sonrası main'e merge
git checkout main
git merge hotfix/critical-bug-fix
git push origin main

# Company'ye gönder
git push company main
```

## 📊 Monitoring

- **Dev Site**: https://dev-vizionmenu.vercel.app
- **Company Repo**: https://github.com/vizionmenu/Food-Ordering-System
- **Vercel Dashboard**: Deployment logları ve analytics

## 🛠️ Troubleshooting

### Problem: "Permission denied to company repository"
```bash
# SSH key'inizi company GitHub organizasyonuna ekleyin
# veya HTTPS ile personal access token kullanın
```

### Problem: "Merge conflicts"
```bash
# Company repo'dan güncel kodları çekin
git fetch company
git pull company main

# Conflict'leri çözün ve tekrar push edin
```

### Problem: "Build fails on deployment"
```bash
# Local'de build test edin
pnpm build

# Dependencies güncel mi kontrol edin
pnpm install

# Cache temizleyin
pnpm clean
``` 