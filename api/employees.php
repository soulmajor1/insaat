<?php
// api/employees.php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

session_start();

require_once 'db_connection.php';
require_once 'utils.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, PUT, OPTIONS");
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

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $employee_id = $_GET['id'] ?? null;
        if ($employee_id) {
            // Belirli bir çalışanı getir
            try {
                $stmt = $conn->prepare("
                    SELECT
                        e.id,
                        e.first_name,
                        e.last_name,
                        e.nationality,
                        e.start_date,
                        e.department_id,
                        d.name AS department_name,
                        e.position_id,
                        p.name AS position_name,
                        e.phone,
                        e.email,
                        e.address,
                        e.date_of_birth,
                        e.gender
                    FROM
                        employees e
                    LEFT JOIN
                        departments d ON e.department_id = d.id
                    LEFT JOIN
                        positions p ON e.position_id = p.id
                    WHERE
                        e.id = ?
                    -- Personel verilerini kullanıcıya özel yapmak isterseniz WHERE e.user_id = ? ekleyin
                    -- ve bind_param'a $user_id ekleyin
                ");
                $stmt->bind_param("s", $employee_id);
                $stmt->execute();
                $result = $stmt->get_result();
                $employee = $result->fetch_assoc();
                if ($employee) {
                    send_json_response(true, 'Personel başarıyla getirildi.', $employee);
                } else {
                    send_json_response(false, 'Personel bulunamadı.');
                }
            } catch (Exception $e) {
                send_json_response(false, 'Personel getirilirken hata oluştu: ' . $e->getMessage());
            }
        } else {
            // Tüm personeli listele
            try {
                $stmt = $conn->prepare("
                    SELECT
                        e.id,
                        e.first_name,
                        e.last_name,
                        e.nationality,
                        e.start_date,
                        e.department_id,
                        d.name AS department_name,
                        e.position_id,
                        p.name AS position_name
                    FROM
                        employees e
                    LEFT JOIN
                        departments d ON e.department_id = d.id
                    LEFT JOIN
                        positions p ON e.position_id = p.id
                    -- Personel verilerini kullanıcıya özel yapmak isterseniz WHERE e.user_id = ? ekleyin
                    -- ve bind_param'a $user_id ekleyin
                    ORDER BY e.first_name ASC, e.last_name ASC
                ");
                // $stmt->bind_param("s", $user_id); // Eğer user_id'ye göre filtreleme olacaksa bu satırı kullanın
                $stmt->execute();
                $result = $stmt->get_result();
                $employees = [];
                while ($row = $result->fetch_assoc()) {
                    $employees[] = $row;
                }
                send_json_response(true, 'Personel başarıyla getirildi.', $employees);
            } catch (Exception $e) {
                send_json_response(false, 'Personel getirilirken hata oluştu: ' . $e->getMessage());
            }
        }
        break;

    case 'POST':
        $input = get_json_input();
        $first_name = $input['firstName'] ?? '';
        $last_name = $input['lastName'] ?? '';
        $nationality = $input['nationality'] ?? null;
        $start_date = $input['startDate'] ?? '';
        $department_id = $input['departmentId'] ?? null;
        $position_id = $input['positionId'] ?? null;
        $phone = $input['phone'] ?? null;
        $email = $input['email'] ?? null;
        $address = $input['address'] ?? null;
        $date_of_birth = $input['dateOfBirth'] ?? null;
        $gender = $input['gender'] ?? null;

        if (empty($first_name) || empty($last_name) || empty($start_date) || empty($department_id) || empty($position_id) || empty($gender)) {
            send_json_response(false, 'Gerekli tüm personel alanları doldurulmalıdır: Ad, Soyad, İşe Başlama Tarihi, Departman, Pozisyon, Cinsiyet.');
        }

        try {
            $employee_id = generate_uuid();
            $stmt = $conn->prepare("INSERT INTO employees (id, first_name, last_name, nationality, start_date, department_id, position_id, phone, email, address, date_of_birth, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("ssssssssssss",
                $employee_id,
                $first_name,
                $last_name,
                $nationality,
                $start_date,
                $department_id,
                $position_id,
                $phone,
                $email,
                $address,
                $date_of_birth,
                $gender
            );

            if ($stmt->execute()) {
                send_json_response(true, 'Personel başarıyla eklendi.', ['id' => $employee_id]);
            } else {
                send_json_response(false, 'Personel eklenirken hata oluştu: ' . $stmt->error);
            }
        } catch (Exception $e) {
            send_json_response(false, 'Personel eklenirken sunucu hatası oluştu: ' . $e->getMessage());
        }
        break;

    case 'PUT':
        $input = get_json_input();
        $employee_id = $_GET['id'] ?? ($input['id'] ?? null);
        $first_name = $input['firstName'] ?? '';
        $last_name = $input['lastName'] ?? '';
        $nationality = $input['nationality'] ?? null;
        $start_date = $input['startDate'] ?? '';
        $department_id = $input['departmentId'] ?? null;
        $position_id = $input['positionId'] ?? null;
        $phone = $input['phone'] ?? null;
        $email = $input['email'] ?? null;
        $address = $input['address'] ?? null;
        $date_of_birth = $input['dateOfBirth'] ?? null;
        $gender = $input['gender'] ?? null;

        if (empty($employee_id) || empty($first_name) || empty($last_name) || empty($start_date) || empty($department_id) || empty($position_id) || empty($gender)) {
            send_json_response(false, 'Güncelleme için gerekli tüm personel alanları doldurulmalıdır.');
        }

        try {
            $stmt = $conn->prepare("UPDATE employees SET first_name = ?, last_name = ?, nationality = ?, start_date = ?, department_id = ?, position_id = ?, phone = ?, email = ?, address = ?, date_of_birth = ?, gender = ? WHERE id = ?");
            $stmt->bind_param("ssssssssssss",
                $first_name,
                $last_name,
                $nationality,
                $start_date,
                $department_id,
                $position_id,
                $phone,
                $email,
                $address,
                $date_of_birth,
                $gender,
                $employee_id
            );

            if ($stmt->execute()) {
                if ($stmt->affected_rows > 0) {
                    send_json_response(true, 'Personel başarıyla güncellendi.');
                } else {
                    send_json_response(false, 'Personel bulunamadı, güncellenecek veri yok veya yetkiniz yok.');
                }
            } else {
                send_json_response(false, 'Personel güncellenirken hata oluştu: ' . $stmt->error);
            }
        } catch (Exception $e) {
            send_json_response(false, 'Personel güncellenirken sunucu hatası oluştu: ' . $e->getMessage());
        }
        break;

    case 'DELETE':
        $employee_id = $_GET['id'] ?? null;

        if (empty($employee_id)) {
            send_json_response(false, 'Silinecek personel ID\'si gerekli.');
        }

        try {
            // İlgili kart basma kayıtları CASCADE ile otomatik silinecektir.
            $stmt = $conn->prepare("DELETE FROM employees WHERE id = ?");
            $stmt->bind_param("s", $employee_id);

            if ($stmt->execute()) {
                if ($stmt->affected_rows > 0) {
                    send_json_response(true, 'Personel başarıyla silindi.');
                } else {
                    send_json_response(false, 'Personel bulunamadı veya silinmeye yetkiniz yok.');
                }
            } else {
                send_json_response(false, 'Personel silinirken hata oluştu: ' . $stmt->error);
            }
        } catch (Exception $e) {
            send_json_response(false, 'Personel silinirken sunucu hatası oluştu: ' . $e->getMessage());
        }
        break;

    default:
        send_json_response(false, 'Desteklenmeyen istek metodu.');
        break;
}

if ($conn) {
    $conn->close();
}
?>
