# YessirPOS - Çox Detallı Hesabatlar (Reports/Analytics) Sistemi Təklif Planı

Aşağıda mövcud POS sisteminizin verilənlər bazası (Prisma schema), komponent və səhifələri nəzərə alınaraq hazırlanmış ən detallı hesabatlar (Analytics) səhifəsinin implementasiya planı verilmişdir. Heç bir fayl hələ dəyişdirilməyib, yalnız plan təqdim edilir.

## 1. Ümumi Konsept və İnterfeys (UI/UX)
Hesabatlar sistemi bir daxili tətbiq (mini-app) kimi işləyəcək və sol paneldə daxili "Tab"lara bölünəcək ki, səhifə çox qarışıq olmasın.
- **Qlobal Filtr Paneli**: Bütün səhifələrin yuxarısında sabitlənmiş olacaq. 
    - **Tarix və Saat**: Yalnız gün yox, saniyəsinə qədər (Format: `YYYY-MM-DD HH:mm:ss`) başlanğıc və bitiş aralığı seçmə variantı.
    - **Sürətli Seçimlər**: "Son 1 saat", "Bugün", "Dünən", "Bu Həftə", "Bu Ay", "Xüsusi (Saniyələrə qədər)".
    - **Geniş Export**: `Excel (XLSX)`, `CSV` və `PDF` formatlarında məlumatları ixrac etmək bacarığı. Modulun içindəki hər bir cədvəlin kənarında ayrıca Export düyməsi olacaq.

## 2. Modullar (Tablar) və Çartlar (Chart.js)

### 2.1 📊 Baş İcmal (Dashboard - Real Time Pulse)
Bütün sistemin səhhətini göstərəcək idarəetmə paneli.
- **Kartlar**: Ümumi Dövriyyə (Gross Revenue), Xalis Məbləğ (Net Revenue: Satışlar - Geri qaytarmalar - Xərclər), Toplam Endirim, Ümumi Qəbul edilən Malların Dəyəri (Intakes).
- **Chart.js Line Chart (Satışların Zirvə Saatları)**: Seçilmiş vaxt intervalına (və ya günün saatlarına) görə əməliyyat intensivliyini (Saniyə/Dəqiqə dəqiqliyində qruplaşdırma) göstərən əyri qrafik.

### 2.2 📦 Məhsul Analitikası (Ən vacib hissə - Product Timeline)
Bir məhsul seçildikdə hər şeyin saniyəsinə qədər tarixçəsinin göstərilməsi.
- **Ən Çox Satılanlar (Top Sellers)** və **Ən Çox Qaytarılanlar (Most Refunded)** üçün Bar Chart-lar.
- **Product Timeline (Məhsulun Həyat Dövrü)** təhlili. Məhsul üzərinə kliklədikdə açılan xüsusi bir modal və ya səhifə:
    - **Vaxt Çərçivəsi (Timeline)**: Məhsul nə vaxt və neçə ədəd "Intake" (Qəbul) olunub, hansı saniyədə satılıb, hansı saniyədə geri qaytarılıb (Refund), stokda necə dəyişikliklər nələrdən ibarətdir. 
    - **Xalis Qazanc Analizi (Product P&L)**: `SaleUnitTotal - WholesaleOrIntakeCostTotal` əsasında bu məhsuldan sırf nə qədər "Net gəlir" əldə edilib.

### 2.3 💰 Satışlar və Geri Ödənişlər (Sales & Refunds)
Sırf kassa hərəkətlərinə fokuslanan bölmə.
- **Ödəniş Növlərinə Görə Gəlir** (Pie Chart/Doughnut Chart): Nağd, Kart, Bonus, Hədiyyə kartı, Köçürmə üzrə bölgü.
- **Refund Analizi**: Hansı satıcının kəsdiyi çeklərin, hansı gün və hansı faizlə geri gəldiyi. Çünki hazırda refundlar satış sisteminin (Sale tablosunun) daxilində `qty` mənfi olaraq və `isRefund: true` təyini ilə yazılır. Bu mənfi rəqəmlər filterlənərək ayrılacaq.
- Detallı Cədvəl: Filterlənmiş vaxt aralığında reallaşan bütün `Sale` (və Refund Sale) sənədlərinin tam siyahısı (Subtotal, Tax, Final, Cashback çıxılanlar).

### 2.4 📉 Mənfəət və Məxaric (P&L and Expenses)
Ticarətdəki "ümumi xalis pul axınının" (Cash Flow) ölçülməsi.
- **Expense Category Chart**: (Pie Chart) Xərclərin növlərinə görə bölünməsi (Maaş, Elektrik, Digər xərclər...).
- **Net Qazanc Qrafiki (Bar Chart)**: Belli günlər (ya da saatlar) üçün: `(Satış - Geri Ödəniş) - Xərclər = Mənfəət`.  Bu sayədə saniyə hesabı olaraq pulun hara getdiyi və gəldiyi görüləcək.

### 2.5 👥 Kadr və Müştəri (Employees & Customers)
- **Satıcı Performansı**: Hansı kassirin / işçinin nə qədər satış etdiyini, nə qədər endirim tətbiq etdiyini göstərən Bar Chart.
- **Müştəri Loyallığı**: Ən yüksək büdcə xərcləyən və ən çox bonus qazanıb xərcləyən müştərilərin siyahısı saniyəli hesabatda.

## 3. Texniki İnfrastruktur İstəkləri 🛠️

1. **Backend API**:
    - `/api/analytics/dashboard`
    - `/api/analytics/products` (Timeline üçün Prisma birgə sorğuları: həm `SaleItem`, həm `IntakeItem` tablosundan tarix üzrə order edərək eyni anda massivə yığmaq).
    - `/api/analytics/sales`
2. **Paketlər**:
    - `chart.js` və `vue-chartjs` modulları istifadə olunacaq.
    - Cədvəllərdən birbaşa Export üçün brauzer əsaslı `xlsx` (və ya `exceljs`) kitabxanasının qurulması.
    - Export formatlaşdırması saniyələrin itməməsi üçün `YYYY-MM-DD HH:mm:ss` olacaq.
3. **Məkan (Lokasiya)**:
    - Yeni səhifə qovluğu: `/app/pages/reports.vue` və alt komponentləri `app/components/reports/` içində olacaq.

---

**Nəticə:**
Bu struktur həm biznes analizlərinizi maksimum şəffaflaşdıracaq, həm məhsulun həyat dövrünü saniyə-saniyə bileyəcəksiniz, həm də Chart.js dəstəyi ilə "wow" dedirdəcək təmiz bir Dashboard alınacaq. 

Əgər bu plan sizi qane edirsə, sadəcə təsdiqləyin, lazımi qovluqları yaradıb işə tam tərtibatda başlayacağam.
