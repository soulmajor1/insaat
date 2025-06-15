<?php
// api/work_codes.php

ini_set('display_errors', 1);
error_reporting(E_ALL);
session_start();

require_once 'db_connection.php';
require_once 'utils.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

$user_id = $_SESSION['user_id'] ?? null;
if (empty($user_id)) {
    send_json_response(false, 'Yetkisiz erişim. Lütfen giriş yapın.');
}

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            $stmt = $conn->prepare("SELECT * FROM work_codes WHERE id = ? AND user_id = ?");
            $stmt->bind_param("ss", $id, $user_id);
            $stmt->execute();
            $item = $stmt->get_result()->fetch_assoc();
            send_json_response(true, 'İş kodu getirildi.', $item);
        } else {
            $stmt = $conn->prepare("SELECT * FROM work_codes WHERE user_id = ? ORDER BY code ASC");
            $stmt->bind_param("s", $user_id);
            $stmt->execute();
            $items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            send_json_response(true, 'İş kodları listelendi.', $items);
        }
        break;

    case 'POST':
        $input = get_json_input();
        $id = generate_uuid();
        $stmt = $conn->prepare("INSERT INTO work_codes (id, user_id, code, description) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssss", $id, $user_id, $input['code'], $input['description']);
        if ($stmt->execute()) {
            send_json_response(true, 'İş kodu başarıyla eklendi.');
        } else {
            send_json_response(false, 'İş kodu eklenirken hata: ' . $stmt->error);
        }
        break;

    case 'PUT':
        $input = get_json_input();
        $id = $input['id'] ?? null;
        if (empty($id)) send_json_response(false, 'ID gerekli.');
        $stmt = $conn->prepare("UPDATE work_codes SET code = ?, description = ? WHERE id = ? AND user_id = ?");
        $stmt->bind_param("ssss", $input['code'], $input['description'], $id, $user_id);
        $stmt->execute();
        send_json_response(true, 'İş kodu güncellendi.');
        break;

    case 'DELETE':
        if (empty($id)) send_json_response(false, 'ID gerekli.');
        $stmt = $conn->prepare("DELETE FROM work_codes WHERE id = ? AND user_id = ?");
        $stmt->bind_param("ss", $id, $user_id);
        $stmt->execute();
        send_json_response(true, 'İş kodu silindi.');
        break;
}
$conn->close();
?>