<?php
// api/projects.php
ini_set('display_errors', 1); error_reporting(E_ALL); session_start();
require_once 'db_connection.php'; require_once 'utils.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

$user_id = $_SESSION['user_id'] ?? null;
if (empty($user_id)) { send_json_response(false, 'Yetkisiz erişim.'); }

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            $stmt = $conn->prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?");
            $stmt->bind_param("ss", $id, $user_id);
            $stmt->execute();
            $project = $stmt->get_result()->fetch_assoc();
            send_json_response(true, 'Proje getirildi.', $project);
        } else {
            $stmt = $conn->prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY name ASC");
            $stmt->bind_param("s", $user_id);
            $stmt->execute();
            $projects = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            send_json_response(true, 'Projeler listelendi.', $projects);
        }
        break;
    case 'POST':
        $input = get_json_input();
        $project_id = generate_uuid();
        $stmt = $conn->prepare("INSERT INTO projects (id, user_id, name, code, location, budget) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssssd", $project_id, $user_id, $input['name'], $input['code'], $input['location'], $input['budget']);
        if ($stmt->execute()) { send_json_response(true, 'Proje başarıyla eklendi.'); }
        else { send_json_response(false, 'Proje eklenirken hata: ' . $stmt->error); }
        break;
    case 'PUT':
        $input = get_json_input();
        $id = $input['id'] ?? null;
        if(!$id) send_json_response(false, 'Proje ID gerekli.');
        $stmt = $conn->prepare("UPDATE projects SET name = ?, code = ?, location = ?, budget = ? WHERE id = ? AND user_id = ?");
        $stmt->bind_param("sssdss", $input['name'], $input['code'], $input['location'], $input['budget'], $id, $user_id);
        $stmt->execute();
        send_json_response(true, 'Proje güncellendi.');
        break;
    case 'DELETE':
        if(!$id) send_json_response(false, 'Proje ID gerekli.');
        $stmt = $conn->prepare("DELETE FROM projects WHERE id = ? AND user_id = ?");
        $stmt->bind_param("ss", $id, $user_id);
        $stmt->execute();
        send_json_response(true, 'Proje silindi.');
        break;
}
$conn->close();
?>