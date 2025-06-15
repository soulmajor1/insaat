<?php
// api/utils.php

// Hata gösterimini aç (geliştirme için)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// JSON formatında standart bir yanıt göndermek için yardımcı fonksiyon
function send_json_response($success, $message, $data = null) {
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
    }
    $response = ['success' => $success, 'message' => $message];
    if ($data !== null) {
        $response['data'] = $data;
    }
    echo json_encode($response);
    exit();
}

// Gelen JSON girdisini okumak için yardımcı fonksiyon
function get_json_input() {
    return json_decode(file_get_contents('php://input'), true);
}

// Benzersiz ID (UUID v4) oluşturmak için fonksiyon
function generate_uuid() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// Şifre hash'lemek için fonksiyon
function hash_password($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

// Şifre doğrulamak için fonksiyon
function verify_password($password, $hash) {
    return password_verify($password, $hash);
}

?>
