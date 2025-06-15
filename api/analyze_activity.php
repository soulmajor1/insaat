<?php
// api/analyze_activity.php

// Hata raporlamayı etkinleştirme
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Oturumu başlat
session_start();

// Gerekli dosyaları dahil et
require_once 'db_connection.php'; // Veritabanı bağlantısı (LLM için doğrudan gerekli olmasa da standart include)
require_once 'utils.php';         // Yardımcı fonksiyonlar (send_json_response, get_json_input vb.)

// CORS başlıkları
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// OPTIONS isteğini önceden yanıtla (CORS preflight için)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Kullanıcının oturum açmış olup olmadığını kontrol et
$user_id = $_SESSION['user_id'] ?? null;
// Burası LLM çağrısı için doğrudan gerekli olmayabilir ancak güvenlik için tutulabilir.
if (empty($user_id)) {
    // send_json_response(false, 'Yetkisiz erişim. Lütfen giriş yapın.');
    // Eğer sadece analiz LLM çağrısı yapılacaksa ve kullanıcıya özel bir veri alınmayacaksa
    // bu kontrol daha esnek olabilir veya kaldırılabilir.
    // Şimdilik hatayı engellemek adına sadece warning geçelim.
    // Gerçek bir LLM entegrasyonunda API anahtarı veya yetkilendirme gerekir.
}


if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = get_json_input();
    $prompt = $input['prompt'] ?? ''; // JavaScript'ten gelen prompt

    if (empty($prompt)) {
        send_json_response(false, 'Analiz için prompt (talep) gereklidir.');
    }

    // *** BURADA GERÇEK LLM (Gemini API) ÇAĞRISI YAPILACAKTIR ***
    // Şimdilik LLM yanıtını simüle edelim.
    // API anahtarınızı burada belirtin (ancak canlı sistemlerde sunucu tarafında güvenli bir şekilde saklayın)
    $apiKey = ""; // Buraya kendi Gemini API anahtarınızı ekleyebilirsiniz, veya boş bırakın
                  // Canvas ortamında otomatik sağlanacaktır.

    $apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={$apiKey}";

    $chatHistory = [
        ['role' => 'user', 'parts' => [['text' => $prompt]]]
    ];

    $payload = [
        'contents' => $chatHistory,
        'generationConfig' => [
            // İsteğe bağlı: responseMimeType ayarı
            // 'responseMimeType' => 'text/plain', // LLM'den düz metin yanıtı bekliyoruz
        ]
    ];

    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_errno($ch)) {
        $error_msg = curl_error($ch);
        curl_close($ch);
        send_json_response(false, 'cURL hatası: ' . $error_msg);
    }
    curl_close($ch);

    $llm_result = json_decode($response, true);

    if ($httpCode !== 200) {
        send_json_response(false, 'LLM API hatası: ' . ($llm_result['error']['message'] ?? 'Bilinmeyen hata'), $llm_result);
    }

    // LLM yanıtını kontrol et ve ayıkla
    if (isset($llm_result['candidates'][0]['content']['parts'][0]['text'])) {
        $analysis_text = $llm_result['candidates'][0]['content']['parts'][0]['text'];
        send_json_response(true, 'Analiz başarılı.', ['analysis' => $analysis_text]);
    } else {
        send_json_response(false, 'LLM yanıtından analiz alınamadı veya format beklenenden farklı.', $llm_result);
    }

} else {
    send_json_response(false, 'Desteklenmeyen istek metodu.');
}

// Veritabanı bağlantısını kapat (eğer açıksa)
if ($conn) {
    $conn->close();
}
?>
