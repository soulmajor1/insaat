<?php
// api/positions.php

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
        // Pozisyonları listele (kullanıcıya özel değil, genel pozisyonlar)
        // Eğer her kullanıcının kendi pozisyon listesi olacaksa, user_id filtresi eklenmeli
        $department_id = $_GET['departmentId'] ?? null; // Departmana göre filtreleme eklendi

        $query = "SELECT id, name, department_id FROM positions";
        $params = [];
        $types = "";

        if ($department_id) {
            $query .= " WHERE department_id = ?";
            $params[] = $department_id;
            $types .= "s";
        }
        $query .= " ORDER BY name ASC";

        $stmt = $conn->prepare($query);
        if ($department_id) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $positions = [];
        while ($row = $result->fetch_assoc()) {
            $positions[] = $row;
        }
        send_json_response(true, 'Pozisyonlar başarıyla getirildi.', $positions);
    } catch (Exception $e) {
        send_json_response(false, 'Pozisyonlar getirilirken hata oluştu: ' . $e->getMessage());
    }
} else {
    send_json_response(false, 'Desteklenmeyen istek metodu.');
}

if ($conn) {
    $conn->close();
}
?>
