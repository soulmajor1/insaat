<?php
// api/export_card_swipes.php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

ob_start(); // Output buffering'i başlat

session_start();

require_once 'db_connection.php';
require_once 'utils.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    if (ob_get_level() > 0) ob_end_clean();
    http_response_code(200);
    exit();
}

$user_id = $_SESSION['user_id'] ?? ($_GET['userId'] ?? null);

if (empty($user_id)) {
    if (ob_get_level() > 0) ob_end_clean();
    http_response_code(401);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Yetkisiz erişim. Lütfen giriş yapın.';
    exit();
}

$stmt = null;
$output_stream = null;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $employee_id = $_GET['employeeId'] ?? null;
    $start_date = $_GET['startDate'] ?? null;
    $end_date = $_GET['endDate'] ?? null;

    try {
        $query = "
            SELECT
                e.first_name,
                e.last_name,
                d.name AS department_name,
                p.name AS position_name,
                e.nationality,
                e.start_date,
                e.phone,
                e.email,
                e.address,
                e.date_of_birth,
                e.gender,
                cs.swipe_time,
                cs.swipe_type,
                cs.device_id
            FROM
                card_swipes cs
            JOIN
                employees e ON cs.employee_id = e.id
            LEFT JOIN
                departments d ON e.department_id = d.id
            LEFT JOIN
                positions p ON e.position_id = p.id
            WHERE 1=1
            -- Eğer personel verilerini kullanıcıya özel yaptıysanız, buraya da e.user_id = ? ekleyin
            -- AND e.user_id = ?
        ";
        $params = [];
        $types = "";

        // Eğer e.user_id filtresi eklediyseniz, buraya da $user_id'yi ekleyin
        // $params[] = $user_id;
        // $types .= "s";

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

        // Başarılı bir şekilde veri çekildiyse çıktı tamponunu temizle ve CSV başlıklarını gönder
        if (ob_get_level() > 0) {
            ob_end_clean();
        }
        ob_start(); // Yeni bir tampon başlat

        $filename_prefix = $employee_id ? "calisan_kart_basmalari_" : "tum_kart_basmalari_";
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename_prefix . date('Ymd_His') . '.csv"');

        $output_stream = fopen('php://output', 'w');
        fwrite($output_stream, "\xEF\xBB\xBF"); // UTF-8 BOM for Excel compatibility

        fputcsv($output_stream, [
            'Ad', 'Soyad', 'Departman', 'Pozisyon', 'Uyruk', 'İşe Başlama Tarihi',
            'Telefon', 'E-posta', 'Adres', 'Doğum Tarihi', 'Cinsiyet',
            'Basma Zamanı', 'Basma Tipi', 'Cihaz ID'
        ]);

        while ($row = $result->fetch_assoc()) {
            fputcsv($output_stream, [
                $row['first_name'],
                $row['last_name'],
                $row['department_name'],
                $row['position_name'],
                $row['nationality'],
                $row['start_date'],
                $row['phone'],
                $row['email'],
                $row['address'],
                $row['date_of_birth'],
                $row['gender'],
                $row['swipe_time'],
                $row['swipe_type'],
                $row['device_id']
            ]);
        }

        fclose($output_stream);
        $stmt->close();
        ob_end_flush(); // Tamponu boşalt ve çıktıyı gönder

    } catch (Exception $e) {
        // Hata durumunda, eğer CSV başlıkları gönderilmediyse JSON hata yanıtı dön
        if (!headers_sent()) {
            if (ob_get_level() > 0) ob_end_clean(); // Hata oluştuğu için tamponu temizle
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => 'Veri dışa aktarılırken hata oluştu: ' . $e->getMessage()]);
        } else {
            // Başlıklar zaten gönderildiyse, hata sadece loglanır, kullanıcıya doğrudan gönderilemez
            error_log("CSV Export Hata: " . $e->getMessage() . " - Dosya: " . $e->getFile() . " - Satır: " . $e->getLine());
        }
    } finally {
        if ($stmt) $stmt->close();
        if ($conn) $conn->close();
    }
} else {
    if (ob_get_level() > 0) ob_end_clean();
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Desteklenmeyen istek metodu.']);
}
exit();
?>
