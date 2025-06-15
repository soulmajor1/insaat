<?php
// api/export_daily_activities.php

// Hata raporlamayı etkinleştirme (geliştirme ortamı için)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Start output buffering at the very beginning.
ob_start();

// Oturumu başlat
session_start();

// Gerekli dosyaları dahil et
require_once 'db_connection.php'; // Veritabanı bağlantısı
require_once 'utils.php';         // Yardımcı fonksiyonlar

// CORS başlıkları (geliştirme için, üretimde daha sıkı olabilir)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS"); // Sadece GET ve OPTIONS'a izin ver
header("Access-Control-Allow-Headers: Content-Type, Authorization");


// OPTIONS isteğini önceden yanıtla (CORS preflight için)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    if (ob_get_level() > 0) ob_end_clean(); // Clear buffer before exiting for OPTIONS
    http_response_code(200);
    exit();
}

// Initialize resources to null for finally block
$stmt = null;
$output_stream = null;
// $conn is initialized in db_connection.php

// Ensure $conn is available. db_connection.php exits on critical failure.
if (!isset($conn) || !$conn instanceof mysqli || $conn->connect_error) {
    if (ob_get_level() > 0) ob_end_clean();
    http_response_code(503); // Service Unavailable
    header('Content-Type: text/plain; charset=utf-8');
    error_log("Export Daily Activities: DB connection object not available or connection error.");
    echo "Veritabanı bağlantı sorunu. Lütfen sistem yöneticisine başvurun.";
    exit();
}

// Kullanıcının oturum açmış olup olmadığını kontrol et
$user_id = $_SESSION['user_id'] ?? ($_GET['userId'] ?? null);

// Eğer geçerli bir kullanıcı ID'si yoksa yetkisiz yanıt ver (plain text formatında)
if (empty($user_id)) {
    if (ob_get_level() > 0) ob_end_clean();
    http_response_code(401); // Unauthorized
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Yetkisiz erişim. Lütfen giriş yapın.';
    if ($conn instanceof mysqli) $conn->close();
    exit();
}

// HTTP isteği metodunu kontrol et
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $csv_specific_headers_sent = false;
        // Günlük faaliyetleri ilişkili proje ve iş kodu bilgileriyle birlikte çek
        $query = "
            SELECT
                da.date,
                p.name AS project_name,
                wc.code AS work_code_code,
                wc.description AS work_code_description,
                da.description AS activity_description,
                da.hours_worked,
                da.materials_used
            FROM
                daily_activities da
            JOIN
                projects p ON da.project_id = p.id
           
            JOIN
                work_codes wc ON da.work_code_id = wc.id
           
            WHERE
                da.user_id = ?
            ORDER BY
                da.date DESC, da.created_at DESC
        ";
        $stmt = $conn->prepare($query);
        if (!$stmt) {
            throw new Exception("Veritabanı sorgusu hazırlanamadı: " . $conn->error);
        }

        $stmt->bind_param("s", $user_id);
        if (!$stmt->execute()) {
            throw new Exception("Sorgu çalıştırılamadı: " . $stmt->error);
        }

        $result = $stmt->get_result();
        if (!$result) {
            throw new Exception("Sonuçlar alınamadı: " . $stmt->error);
        }

        // Clear any output buffered *before* this point.
        // This ensures that if we proceed, only CSV headers and data are in the buffer.
        if (ob_get_level() > 0) {
            ob_end_clean(); // Discard current buffer content
        }
        ob_start(); // Start a fresh buffer specifically for CSV content

        // CSV başlıklarını ayarla
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="gunluk_faaliyetler_' . date('Ymd_His') . '.csv"');
        $csv_specific_headers_sent = true;

        $output_stream = fopen('php://output', 'w');
        if ($output_stream === false) {
            throw new Exception("Çıktı akışı (php://output) açılamadı.");
        }

        // BOM for UTF-8 Excel compatibility
        fwrite($output_stream, "\xEF\xBB\xBF");

        // CSV başlıklarını yaz
        fputcsv($output_stream, ['Tarih', 'Proje Adı', 'İş Kodu', 'İş Kodu Açıklaması', 'Ek Açıklama', 'Çalışılan Saat', 'Kullanılan Malzemeler']);

        // Verileri CSV'ye yaz
        while ($row = $result->fetch_assoc()) {
            fputcsv($output_stream, [
                $row['date'],
                $row['project_name'],
                $row['work_code_code'],
                $row['work_code_description'],
                $row['activity_description'],
                $row['hours_worked'],
                $row['materials_used']
            ]);
        }
        // CSV data is now in the output buffer. ob_end_flush() will send it.
        
    } catch (Exception $e) {
        $error_id = 'EXP' . time(); // Unique ID for this error instance
        $log_message = "Export Error (User: {$user_id}, ErrorID: {$error_id}): " . $e->getMessage() . "\nFile: " . $e->getFile() . "\nLine: " . $e->getLine() . "\nStack Trace:\n" . $e->getTraceAsString();
        error_log($log_message);

        if (!$csv_specific_headers_sent && !headers_sent()) {
            // CSV-specific headers were NOT sent, and no general headers sent yet.
            if (ob_get_level() > 0) ob_end_clean(); // Clean any buffer
            
            http_response_code(500); // Internal Server Error
            header('Content-Type: application/json; charset=utf-8');
            header('Content-Disposition: inline; filename="error.json"'); 
            echo json_encode([
                'success' => false, 
                'message' => 'Veri dışa aktarılırken bir sunucu hatası oluştu. Lütfen sistem yöneticisine başvurun. Hata Referansı: ' . $error_id
            ]);
        } else {
            // CSV-specific headers (or other headers) were already sent.
            // The download will likely be incomplete/corrupted. Error is logged.
            if (ob_get_level() > 0) {
                 ob_end_clean(); // Discard the buffer that was meant for CSV.
            }
        }
        // The finally block will handle resource cleanup.
        // Set a flag to indicate an error occurred for conditional exit after finally.
        $error_occurred = true;
    } finally {
        if ($output_stream) {
            fclose($output_stream);
        }
        if ($stmt instanceof mysqli_stmt) {
            $stmt->close();
        }
        if ($conn instanceof mysqli) {
            $conn->close();
        }
    }

    if (isset($error_occurred) && $error_occurred) {
        exit(); // Exit after cleanup if an error was handled
    }
    
    // If try block completed without exception:
    ob_end_flush(); // Send the buffered CSV content.
    exit(); // Successfully completed.

} else { // Not a GET request
    if (ob_get_level() > 0) ob_end_clean();
    http_response_code(405); // Method Not Allowed
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Desteklenmeyen istek metodu.']);
    if ($conn instanceof mysqli) $conn->close();
    exit();
}

// Fallback, though all paths should exit explicitly.
if (ob_get_level() > 0) ob_end_clean(); // Clean any stray buffer
if (isset($conn) && $conn instanceof mysqli && $conn->thread_id) { // Check if connection is still open
    $conn->close(); // Should have been closed already by specific paths
}
exit();
?>
