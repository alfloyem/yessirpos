8- [x] brend adı seçimi optional olmalıdır.
- [x] satış zamanı kassir seçimi optional olmalıdır.
- [x] mal qebulunda sağda atribut adı görsənmir.
- [x] sidebar düzəlməlidir
- [x] barkod çapı fixlenmelidir
- [x] barkod custom design (mal adı, qiymeti ve diger.)
- [x] çek custom design
- [x] product səhifəsi yenilənməlidir, grid sisteminə keçid olmalıdır.
- [x] product kopyalanan zaman atributlarda kopyalanmalıdır.
- [x] bildiriş sistemi
- [x] settings
- [x] user access sistemi
- [x] borc satış imkanı
- [x] dashboardda exportda mockdata yerine real data istifade edilmelidir.
- [x] hesabatlarda ui/ux yaxşılaşdırılmalıdır, lazımsız ve qarışıq görünen elementler silinmelidir.
- [x] settings-də barkod ve çek funksiyalarının sıraları düzəlməlidir.
- [x] hesabatlar reportsda atributlar göstermir ve tek mehsulun ümumi satışını göstermir.
- [x] satış sehifesinde satış zamanı stock sayı anlıq yenilensin
- [x] product sehifesinde mehsulun üzerinde klik edilen zaman auto redakte dialogu açılsın
- [x] reports mehsullar hissesine pagination elave edilmelidir.
- [x] vercelde .env elave edilmelidir.
- [x] saytda tr dili qalmamalıdır. her şey i18n bağlı olmalıdır.
- [x] sayt tam responsive olmalıdır
- ![x] QA test edilmelidir.
- [] Whatsappdan/mailden mesaj gönderme
- [] AI söhbeti
- [x] tauri və ya electron ilə program yazılmalıdır.
- [] barkod scan və print slient olmalıdır.
- [] multi barkod scan olmalıdır.
- [x] Ана səhifədə Hesabat yüklə düyməsi işləmir
- [x] Əməkdaş və ya ümumiyyətlə nömrə olan hissələrdə nömrə üzərinə basanda whatsapp-a yönləndirmir
- [x] Satış terminalında print söhbəti
- [x] Satış terminalında ödəniş üsulu əlavə etmək olmur
- [x] Satış terminalında multi ödəniş zamanı nisyə vermək olmur
- [x] Çek arxivində atributlar json kimi görünür
- [x] Çek arxivi səhifəsində çap etmə funksiyası işləmir (Həm normal həm də view modal daxilində)
- [x] mail yazılan yerlərdə @ zərurəti əlavə olunsun
- [x] inputlarda silmək ikonu olsun
- [x] satış terminalında hədiyyə kartı barkodu daxil etmək olmur
- [x] Məhsul əlavə edilmir
- [x] Yeni məhsul əlavə edən zaman atributlar sinxron işləmir
- [x] VÖEN hissəsində hərf yazmaq olur ancaq rəqəm olmalıdır
- [x] Mal qəbulu səhifəsində tədarükçü məlumatları json kimi görünür
- [x] Hesabatla səhifəsinə hər girəndə işləmir öz kefinə görə işləyir
- [x] Statistika panelindəki cardlarda "ötən aydan" məlumatları verilmir
- [x] Əməkdaşlar səhifəsində export almaq olmur.
- [x] Satış terminalında məhsula faizlə endirim edən zaman çekdə çıxılan qiyməti səhv göstərir (bkz: ÇEK 0000000000096)
- [x] Çek arxivində faizlə edilən endirimin rəqəmləri səhv görünür
- [x] Barkod çap ləğv edilib
- [x] Yeni atribut əlavə edilmir.
- [x] Hesabatlar səhifəsi ilk girişdə açılmır başqa səhifəyə girəndən sonra açılır

**STRESS TEST BY MUSARTILLERIYA MMC**

npx prisma db push
npx prisma generate
