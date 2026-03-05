@echo off
echo ========================================
echo YESSIR POS - Veritabani Kurulum Scripti
echo ========================================
echo.

REM 1. Paketleri yukle
echo [33m Paketler yukleniyor...[0m
call npm install
if %errorlevel% neq 0 (
    echo [31m Paket yukleme basarisiz![0m
    exit /b 1
)
echo [32m Paketler yuklendi[0m
echo.

REM 2. Prisma Client olustur
echo [33m Prisma Client olusturuluyor...[0m
call npx prisma generate
if %errorlevel% neq 0 (
    echo [31m Prisma Client olusturulamadi![0m
    exit /b 1
)
echo [32m Prisma Client olusturuldu[0m
echo.

REM 3. Veritabanini push et
echo [33m Veritabani semasi push ediliyor...[0m
call npx prisma db push
if %errorlevel% neq 0 (
    echo [31m Veritabani push basarisiz![0m
    echo [33m PostgreSQL'in calistigini ve .env dosyasindaki baglanti bilgilerinin dogru oldugunu kontrol edin.[0m
    exit /b 1
)
echo [32m Veritabani semasi olusturuldu[0m
echo.

REM 4. Seed verilerini ekle
echo [33m Test verileri ekleniyor...[0m
call npm run db:seed
if %errorlevel% neq 0 (
    echo [31m Seed islemi basarisiz![0m
    exit /b 1
)
echo [32m Test verileri eklendi[0m
echo.

REM Basari mesaji
echo [32m Kurulum tamamlandi![0m
echo.
echo Test kullanicilari:
echo   - Kullanici adi: admin, Sifre: 12345678
echo   - Kullanici adi: ahmet_yilmaz, Sifre: 12345678
echo   - Kullanici adi: ayse_kaya, Sifre: 12345678
echo.
echo Uygulamayi baslatmak icin: npm run dev
echo Prisma Studio'yu acmak icin: npm run db:studio
pause
