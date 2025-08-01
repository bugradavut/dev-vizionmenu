# Vision Menu - Kitchen Display TODO List

Bu liste yönetici feedback'ine göre oluşturulmuştur.

## 🏆 HIGH PRIORITY

### 1. Kitchen Display Layout Alternatifleri
- **Problem**: Masonry layout rush hour'larda visual confusion yaratabilir
- **Çözüm**: Farklı layout seçenekleri araştır ve uygula
- **Alt görevler**:
  - [ ] Grid layout alternatifi
  - [ ] List view alternatifi  
  - [ ] Timeline/kanban style layout
  - [ ] Layout seçici toggle
- **Status**: ❌ Başlanmadı

### 2. Pre-orders'ı Live Orders'da Gösterme
- **Problem**: Pre-orderlar ayrı tab'da, staff reminder olarak görmeli
- **Çözüm**: Live Orders'da sarı kart ile pre-orderları göster
- **Alt görevler**:
  - [ ] Pre-order kartları sarı background
  - [ ] "PRE-ORDER" tag'i daha belirgin
  - [ ] Scheduled time görünür
  - [ ] Live Orders'da filtering
- **Status**: ❌ Başlanmadı

### 3. Search Bar (Live Orders & Order History)
- **Problem**: Belirli order'ı bulmak zor
- **Çözüm**: Name/phone/order ID/email ile arama
- **Alt görevler**:
  - [ ] Live Orders search bar
  - [ ] Order History search bar
  - [ ] Multi-field search (name, phone, order ID, email)
  - [ ] Real-time filtering
  - [ ] Search results highlight
- **Status**: ❌ Başlanmadı

## 🔶 MEDIUM PRIORITY

### 4. Renkli Channel Logo'ları
- **Problem**: Monochrome logo'lar visual olarak zor ayırt edilebilir
- **Çözüm**: Her channel'ın brand rengini kullan
- **Alt görevler**:
  - [ ] Uber Eats yeşil logo
  - [ ] DoorDash kırmızı logo
  - [ ] SkipTheDishes turuncu logo
  - [ ] VisionMenu brand rengi
  - [ ] Phone orders için özel renk
  - [ ] Web orders için özel renk
- **Status**: ❌ Başlanmadı

### 5. Partial Refund Özelliği
- **Problem**: Tüm order'ı refund etmek yerine sadece belirli itemları
- **Çözüm**: Item bazında refund seçimi
- **Alt görevler**:
  - [ ] Item checkbox selection
  - [ ] Refund calculation
  - [ ] Refund confirmation modal
  - [ ] Order detail'da refund history
  - [ ] Partial refund backend integration
- **Status**: ❌ Başlanmadı

## 🔽 LOW PRIORITY

### 6. Özelleştirilebilir Order Status Flow
- **Problem**: Her restoran farklı workflow tercih ediyor
- **Çözüm**: Basit vs detaylı status flow seçenekleri
- **Alt görevler**:
  - [ ] Settings'de status flow seçici
  - [ ] Simplified flow: Auto-accept → Preparing → Complete
  - [ ] Detailed flow: Pending → Accepted → Preparing → Ready → Complete
  - [ ] Custom status names
  - [ ] Flow preview
- **Status**: ❌ Başlanmadı

---

## 📝 Notlar

- Her task tamamlandığında status güncellenecek
- Git commit'ler sadece tam task bittiğinde yapılacak
- ESLint/TypeScript kontrolleri her major değişiklik sonrası
- Performance testi kritik değişiklikler sonrası

---

## 🎯 Sprint Planning

**Sprint 1**: Layout Alternatifleri + Pre-order Integration
**Sprint 2**: Search Bar + Channel Colors  
**Sprint 3**: Partial Refund + Status Flow Customization

---

**Son güncelleme**: 2025-08-01
**Toplam task**: 6 ana görev, 25+ alt görev