<?php
// api/db_connection.php

// Hata raporlamayı etkinleştirin (geliştirme ortamı için)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Veritabanı bağlantı bilgileri
define('DB_SERVER', 'localhost'); // Veritabanı sunucusu adresi
define('DB_USERNAME', 'root');     // Veritabanı kullanıcı adı
define('DB_PASSWORD', '');         // Veritabanı şifresi
define('DB_NAME', 'insaat');       // Bağlanılacak veritabanı adı

// MySQLi ile veritabanı bağlantısı kurma
$conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);

// Bağlantıyı kontrol et
if ($conn->connect_error) {
    // Bağlantı hatası durumunda JSON hata mesajı döndür
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Veritabanı bağlantı hatası: ' . $conn->connect_error]);
    exit(); // Komut dosyasının geri kalanını durdur
}

// Karakter setini ayarla (Türkçe karakterler için önemlidir)
$conn->set_charset("utf8mb4");

// Bu dosyayı diğer PHP dosyalarında include ederek $conn değişkenini kullanabilirsiniz.
?>
