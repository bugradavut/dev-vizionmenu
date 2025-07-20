# Multi-Branch User Management System Requirements

## Introduction

Bu özellik, VizionMenu platformunda restaurant chain sahipleri ve yöneticilerinin çok şubeli sistemde kullanıcıları yönetebilmesi için kapsamlı bir User Management sistemi sağlar. Sistem, restaurant chains → branches → users hiyerarşisini destekleyerek, her şubenin kendi kullanıcı yönetimine sahip olmasını sağlayacaktır.

## Requirements

### Requirement 1: Multi-Branch Database Architecture

**User Story:** Restaurant chain sahibi olarak, çok şubeli sistemde kullanıcı yönetimi için gelişmiş database yapısına ihtiyacım var ki her şube kendi kullanıcılarını yönetebilsin.

#### Acceptance Criteria

1. WHEN auth.users tablosuna yeni kullanıcı eklendiğinde THEN sistem otomatik olarak user_profiles tablosuna kayıt oluşturmalı
2. WHEN kullanıcı JWT token aldığında THEN token chain_id, branch_id ve role bilgilerini içermeli
3. WHEN database sorguları yapıldığında THEN RLS politikaları branch_id bazlı izolasyon sağlamalı
4. IF kullanıcı farklı branch'a ait verilere erişmeye çalışırsa THEN sistem bunu engellemeli
5. WHEN chain owner sisteme girdiğinde THEN tüm şubelerin kullanıcılarını görebilmeli
6. WHEN branch manager sisteme girdiğinde THEN sadece kendi şubesinin kullanıcılarını görebilmeli

### Requirement 2: Multi-Branch API Endpoints

**User Story:** Branch yöneticisi olarak, şubem kapsamında kullanıcıları CRUD işlemleri ile yönetebilmek istiyorum ki ekip üyelerimi etkili şekilde organize edebileyim.

#### Acceptance Criteria

1. WHEN GET /api/v1/branches/:branchId/users çağrıldığında THEN sadece o şubenin kullanıcıları dönmeli
2. WHEN GET /api/v1/chains/:chainId/users çağrıldığında THEN chain owner tüm şubelerin kullanıcılarını görebilmeli
3. WHEN POST /api/v1/branches/:branchId/users ile yeni kullanıcı oluşturduğumda THEN kullanıcı otomatik olarak o şubeye atanmalı
4. WHEN PUT /api/v1/users/:id ile kullanıcı güncellendiğinde THEN sadece aynı branch'taki kullanıcılar güncellenebilmeli
5. WHEN DELETE /api/v1/users/:id çağrıldığında THEN kullanıcı sadece yetkili roller tarafından silinebilmeli
6. WHEN POST /api/v1/users/:id/assign-role çağrıldığında THEN sadece chain_owner ve branch_manager rolleri rol atayabilmeli

### Requirement 3: Multi-Branch Role-Based Access Control

**User Story:** Chain sahibi olarak, farklı kullanıcı rollerine şube bazlı farklı yetkiler vermek istiyorum ki operasyonel güvenlik ve hiyerarşi sağlayabileyim.

#### Acceptance Criteria

1. WHEN chain_owner rolündeki kullanıcı sisteme girdiğinde THEN tüm şubelerde tam yönetim yetkilerine sahip olmalı
2. WHEN branch_manager rolündeki kullanıcı sisteme girdiğinde THEN sadece kendi şubesinde kullanıcı ve menü yönetimi yetkilerine sahip olmalı
3. WHEN branch_staff rolündeki kullanıcı sisteme girdiğinde THEN sadece kendi şubesinde sipariş yönetimi yetkilerine sahip olmalı
4. WHEN branch_cashier rolündeki kullanıcı sisteme girdiğinde THEN sadece kendi şubesinde ödeme işlemleri yetkilerine sahip olmalı
5. IF yetkisiz kullanıcı farklı şubeye erişmeye çalışırsa THEN 403 Forbidden hatası dönmeli
6. WHEN multi-branch user (chain_owner) branch seçtiğinde THEN o şube context'inde çalışmalı

### Requirement 4: Multi-Branch Frontend Interface

**User Story:** Branch yöneticisi olarak, şube bazlı kullanıcıları görsel bir arayüzle yönetmek istiyorum ki işlemlerimi hızlı ve kolay yapabileyim.

#### Acceptance Criteria

1. WHEN user management sayfasını açtığımda THEN aktif şubemin kullanıcılarını tablo formatında görmeliyim
2. WHEN chain_owner olarak sisteme girdiğimde THEN şube seçici dropdown görmeliyim
3. WHEN farklı şube seçtiğimde THEN o şubenin kullanıcıları yüklenmeli
4. WHEN "Add User" butonuna tıkladığımda THEN aktif şube için yeni kullanıcı oluşturma modal'ı açılmalı
5. WHEN kullanıcı satırındaki edit butonuna tıkladığımda THEN kullanıcı düzenleme modal'ı açılmalı
6. WHEN kullanıcının rolünü değiştirdiğimde THEN değişiklik anında yansımalı
7. WHEN yetkisiz işlem yapmaya çalıştığımda THEN uygun hata mesajı görmeliyim

### Requirement 5: Multi-Branch Security and Data Isolation

**User Story:** Sistem yöneticisi olarak, şubeler arası veri sızıntısının olmamasını istiyorum ki platform güvenliği sağlansın.

#### Acceptance Criteria

1. WHEN kullanıcı API çağrısı yaptığında THEN sadece yetkili olduğu branch_id'lere ait verilere erişebilmeli
2. WHEN JWT token manipüle edilmeye çalışıldığında THEN sistem bunu tespit etmeli ve erişimi engellemeli
3. WHEN database sorguları çalıştırıldığında THEN RLS politikaları branch_id bazlı her zaman aktif olmalı
4. WHEN cross-branch veri erişimi denendiğinde THEN sistem log kaydı tutmalı ve erişimi engellemeli
5. WHEN chain_owner farklı şubeye geçtiğinde THEN JWT claims güncellenmeli
6. IF kullanıcı session'ı expire olduğunda THEN otomatik olarak login sayfasına yönlendirilmeli

### Requirement 6: Multi-Branch User Experience and Performance

**User Story:** Branch çalışanı olarak, user management sisteminin hızlı ve kullanıcı dostu olmasını istiyorum ki günlük işlerimi verimli yapabileyim.

#### Acceptance Criteria

1. WHEN user management sayfası yüklendiğinde THEN sayfa 2 saniyeden kısa sürede açılmalı
2. WHEN şube değiştirdiğimde THEN yeni şube verileri 1 saniyede yüklenmeli
3. WHEN kullanıcı listesi güncellendiğinde THEN değişiklikler real-time olarak yansımalı
4. WHEN form validasyon hatası olduğunda THEN kullanıcı dostu hata mesajları gösterilmeli
5. WHEN işlem başarılı olduğunda THEN success notification gösterilmeli
6. WHEN mobile cihazdan erişildiğinde THEN responsive tasarım çalışmalı
7. WHEN çok şubeli chain'de çalışırken THEN şube geçişleri smooth olmalı