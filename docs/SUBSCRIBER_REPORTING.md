# Abone raporu için salt okunur özet

Bu dal üretime yayımlanmadı ve otomatik rapora kimlik bilgisi bağlanmadı. Yeni rol/token yok; mevcut platform yöneticisi oturumu gerekir. start/end saat dilimli ISO zorunludur, dönem [start,end), en fazla 31 gün, rapor saat dilimi Europe/Istanbul. Yanıt yalnız toplu sayaç içerir ve private,no-store kullanır. Hatalı dönem 400, kaynak sorunu 503 olur; kaynak yokluğu sıfır sayılmaz.

registeredAccounts kayıtlı hesapları sayar, ücretli aboneleri saymaz. paidSubscribers ve usage alanları ölçüm kaynağı bağlanmadığı için null. organizationAccounts ayrı işletme/firma birimidir; membership ayrı firma üyeliğidir. Aktif plan, deneme veya tarihsel ödeme ücretli abone varsayılmaz. Sayaçlar mevcut veri tabanının anlık toplamı ve dönem içinde oluşturulmuş hâlen mevcut kayıtlarıdır; silinen hesapların tarihsel toplamı değildir. Kendi hesaplarını dışlama yalnız kullanım ölçümüne uygulanır, mevcut kayıt sayaçlarına uygulanmaz.

Yayın öncesi doğru üretim deposu/dalı ve mevcut admin oturumu doğrulanmalı. Günlük çalışana bu oturumu güvenli biçimde sunan mevcut bir yol doğrulanmadığı için URL/kimlik config'i etkinleştirilmedi; kalıcı anahtar oluşturulmadı. Kullanım detayı için mevcut panelin erişim kontrollü /usage.html?app=...&start=...&end=... bağlantısı kullanılır; sync logları oturum logu değildir.
