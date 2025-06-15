<?php
// api/auth.php

// Hata raporlamayı etkinleştirme
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Oturumu başlat
session_start();

// Gerekli dosyaları dahil et
require_once 'db_connection.php';
require_once 'utils.php';

// CORS başlıkları (geliştirme için, üretimde daha sıkı olabilir)
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: GET, POST, DELETE, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json"); 

// OPTIONS isteğini önceden yanıtla (CORS preflight için)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$action = $_GET['action'] ?? null; 

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = get_json_input();

    if ($action === 'logout') {
        session_unset(); 
        session_destroy(); 
        send_json_response(true, 'Başarıyla çıkış yapıldı.');
    }

    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';

    if (empty($username) || empty($password)) {
        send_json_response(false, 'Kullanıcı adı ve şifre gerekli.');
    }

    $stmt = $conn->prepare("SELECT id, username, password_hash FROM users WHERE username = ?");
    if (!$stmt) {
        send_json_response(false, 'SQL hazırlık hatası: ' . $conn->error);
    }
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        if (verify_password($password, $user['password_hash'])) {
            // Giriş başarılı, oturum değişkenlerini ayarla
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            send_json_response(true, 'Giriş başarılı.', ['userId' => $user['id'], 'userName' => $user['username']]);
        } else {
            send_json_response(false, 'Kullanıcı adı veya şifre yanlış.');
        }
    } else {
        // Kullanıcı yoksa, yeni bir kullanıcı oluştur (sadece ilk giriş için)
        $new_user_id = generate_uuid();
        $hashed_password = hash_password($password);

        $stmt = $conn->prepare("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)");
        if (!$stmt) {
            send_json_response(false, 'SQL hazırlık hatası: ' . $conn->error);
        }
        $stmt->bind_param("sss", $new_user_id, $username, $hashed_password);

        if ($stmt->execute()) {
            $_SESSION['user_id'] = $new_user_id;
            $_SESSION['username'] = $username;
            send_json_response(true, 'Kullanıcı oluşturuldu ve giriş başarılı.', ['userId' => $new_user_id, 'userName' => $username]);
        } else {
            send_json_response(false, 'Kullanıcı oluşturulurken hata: ' . $stmt->error);
        }
    }

    $stmt->close();

} else {
    send_json_response(false, 'Desteklenmeyen istek metodu.');
}

$conn->close();
?>
