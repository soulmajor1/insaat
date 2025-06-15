<?php
// api/auth_check.php

session_start();
require_once 'utils.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if (isset($_SESSION['user_id']) && isset($_SESSION['username'])) {
    send_json_response(true, 'Oturum aktif.', [
        'userId' => $_SESSION['user_id'],
        'userName' => $_SESSION['username']
    ]);
} else {
    send_json_response(false, 'Oturum bulunamadı.');
}
?>