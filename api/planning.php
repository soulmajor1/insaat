<?php
// api/planning.php

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

$user_id = $_SESSION['user_id'] ?? null;
if (empty($user_id)) {
    send_json_response(false, 'Yetkisiz erişim. Lütfen giriş yapın.');
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // 1. Tüm plan kalemlerini çek
        $plan_query = "SELECT id, wbs_code, activity_name, start_date, end_date, budgeted_man_hour FROM project_plan_items WHERE user_id = ? ORDER BY start_date ASC, wbs_code ASC";
        $plan_stmt = $conn->prepare($plan_query);
        $plan_stmt->bind_param("s", $user_id);
        $plan_stmt->execute();
        $plan_items = $plan_stmt->get_result()->fetch_all(MYSQLI_ASSOC);

        // 2. Tüm gerçekleşen saatleri iş koduna göre gruplayarak çek
        $actuals_query = "SELECT wc.code, SUM(da.hours_worked) as actual_hours FROM daily_activities da JOIN work_codes wc ON da.work_code_id = wc.id WHERE da.user_id = ? GROUP BY wc.code";
        $actuals_stmt = $conn->prepare($actuals_query);
        $actuals_stmt->bind_param("s", $user_id);
        $actuals_stmt->execute();
        $actuals_result = $actuals_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        
        $actuals = [];
        foreach ($actuals_result as $row) {
            $actuals[$row['code']] = (float)$row['actual_hours'];
        }

        // 3. Plan ve gerçekleşen verilerini birleştir, ilerlemeyi ve özet metrikleri hesapla
        $total_budgeted_hours = 0;
        $total_actual_hours = 0;
        $total_earned_value = 0; // Kazanılmış Değer (EV) için yeni değişken
        $enriched_plan_items = [];

        foreach ($plan_items as $item) {
            $wbs_code = $item['wbs_code'];
            $budgeted = (float)$item['budgeted_man_hour'];
            $actual = $actuals[$wbs_code] ?? 0;
            
            $total_budgeted_hours += $budgeted;
            $total_actual_hours += $actual;

            $progress = 0;
            if ($budgeted > 0) {
                $progress = round(($actual / $budgeted) * 100);
            }
            if ($progress > 100) $progress = 100;
            
            // Kazanılmış Değeri (EV) hesapla: Bütçe * İlerleme %
            $earned_value_item = $budgeted * ($progress / 100);
            $total_earned_value += $earned_value_item;

            $item['actual_man_hour'] = $actual;
            $item['progress_percentage'] = $progress;
            $enriched_plan_items[] = $item;
        }

        // 4. Genel ilerlemeyi ve özet verileri hesapla
        $overall_progress = 0;
        if ($total_budgeted_hours > 0) {
            $overall_progress = round(($total_actual_hours / $total_budgeted_hours) * 100);
        }
        if ($overall_progress > 100) $overall_progress = 100;
        
        // DOĞRU CPI HESAPLAMASI
        $cpi = 0;
        if ($total_actual_hours > 0) {
            // CPI = Kazanılmış Değer (EV) / Gerçekleşen Maliyet (AC)
            $cpi = $total_earned_value / $total_actual_hours;
        }

        $summary = [
            'total_budgeted_hours' => $total_budgeted_hours,
            'total_actual_hours' => $total_actual_hours,
            'overall_progress' => $overall_progress,
            'activity_count' => count($plan_items),
            'cpi' => $cpi // Yeni eklenen doğru CPI değeri
        ];

        $response_data = [
            'plan_items' => $enriched_plan_items,
            'summary' => $summary
        ];
        
        send_json_response(true, 'Planlama verileri başarıyla getirildi.', $response_data);

    } catch (Exception $e) {
        send_json_response(false, 'Planlama verileri getirilirken hata oluştu: ' . $e->getMessage());
    }
} else {
    send_json_response(false, 'Desteklenmeyen istek metodu.');
}

$conn->close();
?>