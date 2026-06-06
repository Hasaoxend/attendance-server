# Attendance Server — Backend API

Backend API cho Hệ thống Quản lý Điểm danh Sinh viên chống gian lận.

## Công nghệ
- **Runtime**: Node.js + Express
- **Database**: PostgreSQL
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Anti-Cheat**: HMAC-SHA256 QR rotation, Haversine geofencing, Device fingerprinting

## Cài đặt

### 1. Clone repo
```bash
git clone https://github.com/YOUR_USERNAME/attendance-server.git
cd attendance-server
```

### 2. Cài dependencies
```bash
npm install
```

### 3. Cấu hình môi trường
Copy file mẫu và điền thông tin:
```bash
cp .env.example .env
```

Chỉnh sửa `.env`:
```env
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASS=your_password
DB_NAME=student_system
JWT_SECRET=your_secret
QR_SECRET=your_qr_secret
FRONTEND_URL=http://localhost:5173
```

### 4. Tạo database
Mở pgAdmin → tạo database `student_system` → chạy `db.sql`.

### 5. Seed dữ liệu mẫu
```bash
npm run seed
```

### 6. Chạy server
```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Server chạy tại `http://localhost:5000`.

## API Endpoints

| Method | Endpoint | Mô tả | Auth |
|--------|----------|--------|------|
| POST | `/api/auth/login` | Đăng nhập | — |
| POST | `/api/auth/register` | Đăng ký user | — |
| PUT | `/api/auth/change-password` | Đổi mật khẩu | ✅ |
| GET | `/api/events` | Danh sách sự kiện | ✅ |
| POST | `/api/events` | Tạo sự kiện | Admin |
| PUT | `/api/events/:id` | Sửa sự kiện | Admin |
| DELETE | `/api/events/:id` | Xóa sự kiện | Admin |
| POST | `/api/events/:id/register` | SV đăng ký sự kiện | Student |
| POST | `/api/checkins` | Điểm danh (multi-factor) | Student |
| GET | `/api/students` | Danh sách sinh viên | Admin |
| GET | `/api/history/student` | Lịch sử SV | Student |
| GET | `/api/health` | Health check | — |

## Deploy lên Render.com

👉 Xem hướng dẫn chi tiết step-by-step tại file [DEPLOY.md](./DEPLOY.md)

**Tóm tắt**: Ứng dụng deploy dạng monolith — backend serve cả frontend.
Build command tự build React app và copy vào `public/`.

## Tài khoản mặc định (sau khi seed)
- **Admin**: `admin` / `admin123`
- **Cán bộ Đoàn**: `union_officer` / `password123`
- **Sinh viên**: `student` / `password123`
- **Sinh viên 2**: `student2` / `password123`

