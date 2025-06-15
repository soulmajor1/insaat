<?php
// api/daily_activities.php

ini_set('display_errors', 1);
error_reporting(E_ALL);

// Herhangi bir beklenmedik hatayı yakalayıp JSON formatında döndüren global bir hata yakalayıcı.
// Bu, "Unexpected token '<'" hatasının ana çözümüdür.
set_exception_handler(function($exception) {
    // Headers'ın zaten gönderilip gönderilmediğini kontrol et
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-h');
        http_response_code(500); // Sunucu Hatası
    }
    echo json_encode([
        'success' => false,
        'message' => 'Beklenmedik bir sunucu hatası oluştu: ' . $exception->getMessage(),
        'file' => $exception->getFile(),
        'line' => $exception->getLine()
    ]);
    exit();
});

session_start();

require_once 'db_connection.php';
require_once 'utils.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

$user_id = $_SESSION['user_id'] ?? null;
if (empty($user_id)) {
    send_json_response(false, 'Yetkisiz erişim. Lütfen giriş yapın.');
}

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

// Tüm işlemleri bir try-catch bloğuna alarak daha fazla güvenlik sağlıyoruz.
try {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $conn->prepare("SELECT * FROM daily_activities WHERE id = ? AND user_id = ?");
                $stmt->bind_param("ss", $id, $user_id);
                $stmt->execute();
                $activity = $stmt->get_result()->fetch_assoc();
                send_json_response(true, 'Aktivite getirildi.', $activity);
            } else {
                $query = "
                    SELECT 
                        da.id, da.date, da.project_id, da.work_code_id, da.description, da.hours_worked, da.materials_used,
                        p.name AS project_name, 
                        wc.code AS work_code_code, wc.description AS work_code_description
                    FROM daily_activities da
                    LEFT JOIN projects p ON da.project_id = p.id
                    LEFT JOIN work_codes wc ON da.work_code_id = wc.id
                    WHERE da.user_id = ?
                    ORDER BY da.date DESC, da.created_at DESC";
                
                $stmt = $conn->prepare($query);
                $stmt->bind_param("s", $user_id);
                $stmt->execute();
                $result = $stmt->get_result();
                $activities = $result->fetch_all(MYSQLI_ASSOC);
                send_json_response(true, 'Günlük faaliyetler listelendi.', $activities);
            }
            break;

        case 'POST':
            $input = get_json_input();
            $activity_id = generate_uuid();
            $stmt = $conn->prepare("INSERT INTO daily_activities (id, user_id, project_id, work_code_id, date, description, hours_worked, materials_used) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            
            // Hazırlık başarısız olursa hata fırlat
            if ($stmt === false) {
                throw new Exception("SQL hazırlanamadı (INSERT): " . $conn->error);
            }

            $stmt->bind_param("ssssssds", $activity_id, $user_id, $input['projectId'], $input['workCodeId'], $input['date'], $input['description'], $input['hoursWorked'], $input['materialsUsed']);
            if ($stmt->execute()) {
                send_json_response(true, 'Faaliyet başarıyla eklendi.', ['id' => $activity_id]);
            } else {
                throw new Exception("Faaliyet eklenemedi: " . $stmt->error);
            }
            break;

        case 'PUT':
            $input = get_json_input();
            $id = $input['id'] ?? null;
            if(!$id) send_json_response(false, 'Güncelleme için Aktivite ID gerekli.');
            
            $stmt = $conn->prepare("UPDATE daily_activities SET project_id = ?, work_code_id = ?, date = ?, description = ?, hours_worked = ?, materials_used = ? WHERE id = ? AND user_id = ?");
            
            // Hazırlık başarısız olursa hata fırlat
            if ($stmt === false) {
                throw new Exception("SQL hazırlanamadı (UPDATE): " . $conn->error);
            }

            // GÜNCELLEME: $input['id'] yerine $id kullanıldı, $user_id sona eklendi.
            // bind_param'daki tip sayısı (8) ile sorgudaki soru işareti sayısı (8) eşleşiyor.
            $stmt->bind_param("ssssdsss", $input['projectId'], $input['workCodeId'], $input['date'], $input['description'], $input['hoursWorked'], $input['materialsUsed'], $id, $user_id);
            
            if ($stmt->execute()) {
                 if ($stmt->affected_rows > 0) {
                    send_json_response(true, 'Faaliyet başarıyla güncellendi.');
                } else {
                    send_json_response(false, 'Güncellenecek bir veri bulunamadı veya veri aynı.');
                }
            } else {
                throw new Exception("Faaliyet güncellenemedi: " . $stmt->error);
            }
            break;

        case 'DELETE':
            if(!$id) send_json_response(false, 'Silme için Aktivite ID gerekli.');
            
            $stmt = $conn->prepare("DELETE FROM daily_activities WHERE id = ? AND user_id = ?");
            
            // Hazırlık başarısız olursa hata fırlat
            if ($stmt === false) {
                throw new Exception("SQL hazırlanamadı (DELETE): " . $conn->error);
            }

            $stmt->bind_param("ss", $id, $user_id);
            if ($stmt->execute()) {
                if ($stmt->affected_rows > 0) {
                    send_json_response(true, 'Faaliyet başarıyla silindi.');
                } else {
                    send_json_response(false, 'Silinecek faaliyet bulunamadı.');
                }
            } else {
                throw new Exception("Faaliyet silinemedi: " . $stmt->error);
            }
            break;
    }
} catch (Throwable $e) {
    // Herhangi bir hatayı yakala ve JSON formatında döndür
    send_json_response(false, 'İşlem sırasında bir hata oluştu: ' . $e->getMessage());
}

$conn->close();
?>