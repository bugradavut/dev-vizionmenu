# Order Source Icons

Bu klasör sipariş kaynaklarını gösteren gerçek ikonları içerir.

## 📁 Dosya Adlandırması:
- `qr-code.webp` - QR Code siparişleri için
- `uber-eats.webp` - Uber Eats siparişleri için  
- `phone.webp` - Telefon siparişleri için
- `web.webp` - Web/Online siparişleri için
- `doordash.webp` - DoorDash siparişleri için
- `grubhub.webp` - GrubHub siparişleri için
- `admin.webp` - Admin panel siparişleri için

## 🎨 Tasarım Önerileri:
- **Boyut**: 32x32px veya 64x64px (SVG ideal ama WebP de tamam)
- **Background**: Şeffaf (transparent)
- **Style**: Modern, flat design
- **Colors**: Brand renklerini kullan (Uber yeşil, vs.)

## 💻 Kodda Kullanım:
```tsx
import qrIcon from '@/assets/images/order-sources/qr-code.webp'
import uberIcon from '@/assets/images/order-sources/uber-eats.webp'
// ...

const getSourceIcon = (source: string) => {
  switch (source) {
    case 'qr_code': return qrIcon
    case 'uber_eats': return uberIcon
    // ...
  }
}
```

## 📱 Next.js Optimizasyonu:
Next.js otomatik olarak bu görselleri optimize edecek ve lazy loading uygulayacak.