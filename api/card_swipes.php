<?php
// api/card_swipes.php

ini_set('display_errors', 1);
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

// GÜVENLİK GÜNCELLEMESİ: Kullanıcı ID'si sadece sunucu tarafındaki oturumdan alınır.
$user_id = $_SESSION['user_id'] ?? null;

if (empty($user_id)) {
    send_json_response(false, 'Yetkisiz erişim. Lütfen giriş yapın.');
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $employee_id = $_GET['employeeId'] ?? null;
    $start_date = $_GET['startDate'] ?? null;
    $end_date = $_GET['endDate'] ?? null;

    try {
        // Not: Bu sorgu, tüm kullanıcıların tüm çalışanları görebileceği varsayımıyla çalışır.
        // Eğer her kullanıcı sadece kendi çalışanlarını görmeli ise, employees tablosuna bir 'user_id'
        // kolonu eklenmeli ve sorguya `AND e.user_id = ?` koşulu eklenmelidir.
        $query = "
            SELECT cs.id, cs.employee_id, e.first_name AS employee_first_name, e.last_name AS employee_last_name,
                   cs.swipe_time, cs.swipe_type, cs.device_id
            FROM card_swipes cs
            JOIN employees e ON cs.employee_id = e.id
            WHERE 1=1
        ";
        $params = [];
        $types = "";

        if ($employee_id) {
            $query .= " AND cs.employee_id = ?";
            $params[] = $employee_id;
            $types .= "s";
        }
        if ($start_date) {
            $query .= " AND DATE(cs.swipe_time) >= ?";
            $params[] = $start_date;
            $types .= "s";
        }
        if ($end_date) {
            $query .= " AND DATE(cs.swipe_time) <= ?";
            $params[] = $end_date;
            $types .= "s";
        }

        $query .= " ORDER BY cs.swipe_time DESC";

        $stmt = $conn->prepare($query);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $card_swipes = $result->fetch_all(MYSQLI_ASSOC);
        send_json_response(true, 'Kart basma kayıtları başarıyla getirildi.', $card_swipes);
    } catch (Exception $e) {
        send_json_response(false, 'Kart basma kayıtları getirilirken hata oluştu: ' . $e->getMessage());
    }
} else {
    send_json_response(false, 'Desteklenmeyen istek metodu.');
}

if ($conn) {
    $conn->close();
}
?>
