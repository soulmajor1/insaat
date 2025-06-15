<?php
// api/departments.php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

session_start();

require_once 'db_connection.php';
require_once 'utils.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$user_id = $_SESSION['user_id'] ?? ($_GET['userId'] ?? null);

if (empty($user_id)) {
    send_json_response(false, 'Yetkisiz erişim. Lütfen giriş yapın.');
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Departmanları listele (kullanıcıya özel değil, genel departmanlar)
        // Eğer her kullanıcının kendi departman listesi olacaksa, user_id filtresi eklenmeli
        $stmt = $conn->prepare("SELECT id, name FROM departments ORDER BY name ASC");
        // $stmt->bind_param("s", $user_id); // Eğer user_id'ye göre filtreleme olacaksa bu satırı kullanın
        $stmt->execute();
        $result = $stmt->get_result();
        $departments = [];
        while ($row = $result->fetch_assoc()) {
            $departments[] = $row;
        }
        send_json_response(true, 'Departmanlar başarıyla getirildi.', $departments);
    } catch (Exception $e) {
        send_json_response(false, 'Departmanlar getirilirken hata oluştu: ' . $e->getMessage());
    }
} else {
    send_json_response(false, 'Desteklenmeyen istek metodu.');
}

if ($conn) {
    $conn->close();
}
?>
