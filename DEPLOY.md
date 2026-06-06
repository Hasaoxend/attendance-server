# 🚀 Hướng Dẫn Deploy — Hệ Thống Điểm Danh Sinh Viên

> Hướng dẫn này dành cho **bất kỳ ai** nhận được source code và muốn tự deploy lên internet.
> Không cần kinh nghiệm DevOps. Chỉ cần làm theo từng bước.

---

## 📋 Bạn cần chuẩn bị gì?

| # | Cần gì | Có chưa? |
|---|--------|----------|
| 1 | **Tài khoản GitHub** — [đăng ký miễn phí](https://github.com/signup) | ☐ |
| 2 | **Tài khoản Render** — [đăng ký miễn phí](https://render.com) (dùng GitHub để đăng nhập cho nhanh) | ☐ |
| 3 | **Git** cài trên máy — [tải tại đây](https://git-scm.com/downloads) | ☐ |
| 4 | **Node.js** (v18+) cài trên máy — [tải tại đây](https://nodejs.org) | ☐ |
| 5 | Source code (2 thư mục: `attendance-server` và `attendance-client`) | ☐ |

**Kiểm tra Git và Node đã cài chưa**: mở PowerShell (hoặc Terminal), gõ:
```
git --version
node --version
```
Nếu hiện version → OK. Nếu báo lỗi → cài lại theo link trên.

---

## BƯỚC 1: Đưa code lên GitHub

### 1.1 — Tạo repository mới trên GitHub

1. Đăng nhập GitHub
2. Nhấn nút **+** (góc phải trên) → chọn **New repository**
3. Điền thông tin:
   - **Repository name**: `attendance-app`
   - **Description**: `Hệ thống điểm danh sinh viên`
   - **Chọn**: `Public` (hoặc `Private` nếu muốn ẩn)
   - ⚠️ **KHÔNG tick** "Add a README file"
   - ⚠️ **KHÔNG tick** "Add .gitignore"
4. Nhấn **Create repository**
5. Bạn sẽ thấy trang hướng dẫn. **Giữ trang này mở**, ta sẽ cần URL repo.
   - URL dạng: `https://github.com/TEN-CUA-BAN/attendance-app.git`

### 1.2 — Gộp code và push lên GitHub

Mở **PowerShell** (nhấn phím Windows, gõ `powershell`, nhấn Enter).

Copy **từng khối lệnh** dưới đây, paste vào PowerShell và nhấn Enter:

**Bước a) Tạo thư mục monorepo:**
```powershell
# Đổi đường dẫn nếu source code ở chỗ khác
cd "d:\Visual Studio Project"
mkdir attendance-app
cd attendance-app
```

**Bước b) Copy source code vào (bỏ thư mục .git cũ và node_modules):**
```powershell
# Copy backend
robocopy "..\ThucTap\attendance-server" ".\attendance-server" /E /XD .git node_modules public

# Copy frontend
robocopy "..\ThucTap\attendance-client" ".\attendance-client" /E /XD .git node_modules dist .firebase
```
> ℹ️ robocopy sẽ in ra nhiều dòng, kệ nó. Miễn không có dòng đỏ `ERROR` là OK.

**Bước c) Tạo Git repo và push:**
```powershell
# Tạo git repo mới
git init
git branch -M main

# Thêm tất cả file
git add .

# Commit
git commit -m "Initial commit: attendance system"

# Kết nối GitHub (ĐỔI URL THÀNH CỦA BẠN)
git remote add origin https://github.com/TEN-CUA-BAN/attendance-app.git

# Push lên
git push -u origin main
```

> ⚠️ **QUAN TRỌNG**: Thay `TEN-CUA-BAN` bằng username GitHub thật của bạn!
>
> Nếu lần đầu push, Git sẽ hỏi đăng nhập GitHub. Làm theo hướng dẫn trên màn hình.

### 1.3 — Kiểm tra

Vào lại trang GitHub repo của bạn, refresh. Phải thấy:
```
attendance-app/
├── attendance-server/
│   ├── index.js          ← Backend chính
│   ├── render.yaml       ← Cấu hình deploy
│   ├── package.json
│   └── ...
└── attendance-client/
    ├── src/              ← Source React
    ├── package.json
    └── ...
```
✅ Nếu thấy 2 thư mục → **Bước 1 thành công!**

---

## BƯỚC 2: Tạo Database trên Render

### 2.1 — Đăng nhập Render

1. Vào [dashboard.render.com](https://dashboard.render.com)
2. Nhấn **Sign in with GitHub** (nhanh nhất)
3. Cho phép Render truy cập GitHub

### 2.2 — Tạo PostgreSQL Database

1. Trên Dashboard, nhấn nút **New +** (góc phải trên)
2. Chọn **PostgreSQL**
3. Điền thông tin:

| Mục | Điền gì |
|-----|---------|
| **Name** | `attendance-db` |
| **Database** | `attendance_db` |
| **User** | Để mặc định (Render tự tạo) |
| **Region** | Chọn `Singapore (Southeast Asia)` ← gần VN nhất |
| **PostgreSQL Version** | Để mặc định |
| **Plan** | Chọn **Free** |

4. Nhấn **Create Database**
5. Chờ 1-2 phút, trạng thái chuyển thành **Available**

### 2.3 — Lấy Database URL

1. Sau khi database tạo xong, bạn sẽ ở trang thông tin database
2. Kéo xuống phần **Connections**
3. Tìm dòng **Internal Database URL**
4. Nhấn nút **Copy** bên cạnh
5. **Lưu lại** (paste vào Notepad tạm) — sẽ dùng ở Bước 3

> URL dạng: `postgresql://attendance_db_user:ABC123xyz@dpg-xxx-a.singapore-postgres.render.com/attendance_db`

> ⚠️ **Lưu ý**: Free database sẽ bị xóa sau **90 ngày**. Đủ cho demo và thực tập.

---

## BƯỚC 3: Deploy ứng dụng lên Render

### 3.1 — Tạo Web Service

1. Trên Render Dashboard, nhấn **New +** → **Web Service**
2. Chọn **Build and deploy from a Git repository** → nhấn **Next**
3. Tìm repo `attendance-app` trong danh sách
   - Nếu không thấy → nhấn **Configure account** → cho phép Render truy cập repo đó
4. Nhấn **Connect** bên cạnh repo `attendance-app`

### 3.2 — Cấu hình Web Service

Điền **chính xác** như bảng dưới:

| Mục | Điền gì |
|-----|---------|
| **Name** | `attendance-app` |
| **Region** | **Cùng region với database** (ví dụ: `Singapore (Southeast Asia)`) |
| **Branch** | `main` |
| **Root Directory** | `attendance-server` |
| **Runtime** | `Node` |
| **Build Command** | *(copy nguyên đoạn dưới)* |
| **Start Command** | `node index.js` |
| **Plan** | `Free` |

**Build Command** — copy nguyên đoạn này:
```
npm install && cd ../attendance-client && npm install && npm run build && cp -r dist ../attendance-server/public
```

> ⚠️ **Root Directory = `attendance-server`** ← phải điền đúng, không phải để trống!

### 3.3 — Thêm Environment Variables

Kéo xuống phần **Environment Variables**, nhấn **Add Environment Variable** cho mỗi dòng:

| Key | Value | Ghi chú |
|-----|-------|---------|
| `NODE_ENV` | `production` | Gõ chữ `production` |
| `DATABASE_URL` | *(paste URL đã copy ở Bước 2.3)* | Paste nguyên chuỗi dài |
| `JWT_SECRET` | `MyJwtSecret2024xYz` | Đổi thành chuỗi bất kỳ bạn muốn |
| `QR_SECRET` | `MyQrSecret2024aBc` | Đổi thành chuỗi bất kỳ bạn muốn |

> 💡 `JWT_SECRET` và `QR_SECRET` là chuỗi bí mật bất kỳ (ít nhất 16 ký tự). 
> Ví dụ: `tR4nG_d@i_h0c_2024!` — miễn là đừng để lộ cho ai.

### 3.4 — Deploy!

1. Nhấn **Create Web Service**
2. Render bắt đầu build. Bạn sẽ thấy log chạy trên màn hình
3. **Chờ 3-5 phút** — quá trình build gồm:
   - Cài đặt backend dependencies
   - Cài đặt frontend dependencies  
   - Build frontend
   - Copy vào backend
   - Khởi động server

4. Khi thấy dòng log:
   ```
   Server is running on port 10000
   [DB] Schema ensured
   ```
   → 🎉 **Deploy thành công!**

5. Nếu thấy lỗi đỏ → xem phần **Xử lý lỗi thường gặp** ở cuối.

### 3.5 — Lấy URL ứng dụng

1. Ở đầu trang Web Service, dưới tên service
2. Bạn sẽ thấy URL dạng: `https://attendance-app-xxxx.onrender.com`
3. **Đây là URL ứng dụng của bạn!** Gửi cho ai cũng truy cập được.

---

## BƯỚC 4: Tạo dữ liệu mẫu (tùy chọn)

Nếu muốn có sẵn tài khoản test, làm như sau:

### 4.1 — Mở Shell trên Render

1. Vào Render Dashboard → chọn service `attendance-app`
2. Nhấn tab **Shell** (bên cạnh Logs, Events...)
3. Chờ terminal mở

### 4.2 — Chạy seed

Gõ lệnh:
```bash
node seed.js
```

Khi thấy `Seeding completed successfully!` → xong!

### 4.3 — Tài khoản test có sẵn

| Vai trò | Username | Mật khẩu |
|---------|----------|-----------|
| Admin | `admin` | `admin123` |
| Cán bộ Đoàn | `union_officer` | `password123` |
| Sinh viên 1 | `student` | `password123` |
| Sinh viên 2 | `student2` | `password123` |

---

## BƯỚC 5: Kiểm tra ứng dụng

Mở trình duyệt, truy cập URL từ Bước 3.5:

| # | Kiểm tra | Cách test | Kết quả đúng |
|---|----------|-----------|--------------|
| 1 | Server hoạt động | Vào `https://URL-CUA-BAN/api/health` | Thấy `{"status":"ok"}` |
| 2 | Trang web hiển thị | Vào `https://URL-CUA-BAN/` | Thấy trang đăng nhập |
| 3 | Đăng nhập | Nhập `admin` / `admin123` | Vào được dashboard |
| 4 | Tạo sự kiện | Vào Quản lý sự kiện → Tạo mới | Tạo thành công |
| 5 | Điểm danh | Mở sự kiện → Bật điểm danh → Scan QR | Check-in thành công |
| 6 | Xem báo cáo | Vào Báo cáo / Thống kê | Dữ liệu hiển thị |

---

## ⚡ Lưu ý quan trọng khi dùng Render Free

### 1. Server tự tắt khi không dùng
- Free tier sẽ **tắt server sau 15 phút** không có ai truy cập
- Lần truy cập đầu tiên sau khi tắt: **chậm 30-60 giây** (chờ server khởi động lại)
- Sau đó nhanh bình thường
- **Đây là bình thường**, không phải lỗi

### 2. File upload sẽ mất khi re-deploy
- Ảnh, file tải lên sẽ **bị xóa** khi Render re-deploy
- Dùng cho demo/thực tập thì OK
- Nếu cần giữ file lâu dài → cần dùng dịch vụ lưu trữ ngoài (Cloudinary, AWS S3)

### 3. Database hết hạn sau 90 ngày
- Free database tự xóa sau 90 ngày
- Backup trước khi hết hạn (xem phần Backup bên dưới)
- Hoặc tạo database mới và seed lại

### 4. Tự động deploy khi push code
- Mỗi lần bạn `git push` lên branch `main` → Render **tự build và deploy lại**
- Không cần vào Dashboard làm gì

---

## 🔧 Xử lý lỗi thường gặp

### Lỗi: "Build failed"
**Nguyên nhân**: Thường do `Root Directory` sai hoặc `Build Command` sai
**Cách sửa**:
1. Vào Render → Service → Settings
2. Kiểm tra `Root Directory` = `attendance-server` (không phải trống, không phải `/`)
3. Kiểm tra Build Command copy đúng y nguyên

### Lỗi: "SASL: SCRAM-SERVER-FIRST-MESSAGE" hoặc "password must be a string"
**Nguyên nhân**: `DATABASE_URL` chưa set hoặc sai
**Cách sửa**:
1. Vào Render → Service → Environment
2. Kiểm tra `DATABASE_URL` đã paste đúng Internal URL từ database
3. Đảm bảo copy **Internal** Database URL (không phải External)

### Lỗi: "Not allowed by CORS"  
**Nguyên nhân**: FE và BE khác domain
**Cách sửa**: Không xảy ra nếu dùng đúng cách deploy này (cùng domain). Nếu bạn test local, đọc phần Chạy Local bên dưới.

### Lỗi: Trang trắng hoặc 404 khi truy cập
**Nguyên nhân**: Build FE thất bại hoặc không copy vào `public/`
**Cách sửa**: Xem log build trên Render, tìm dòng lỗi trong phần build frontend

---

## 💻 Chạy Local (dành cho developer)

Nếu muốn chạy trên máy cá nhân để phát triển:

### Cài đặt
```powershell
# Terminal 1: Backend
cd attendance-server
copy .env.example .env
# Sửa file .env: điền DB_HOST, DB_USER, DB_PASS, DB_NAME, JWT_SECRET, QR_SECRET
npm install
npm run dev

# Terminal 2: Frontend  
cd attendance-client
npm install
npm run dev
```

### Truy cập
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api`
- Frontend tự proxy `/api` requests tới backend (cấu hình sẵn trong `vite.config.ts`)

---

## 📦 Backup Database

```bash
# Trên máy cá nhân (cần cài PostgreSQL client)
# Thay DATABASE_URL bằng External Database URL từ Render
pg_dump "postgresql://user:pass@host/dbname" > backup.sql

# Restore vào database mới
psql "postgresql://user:pass@new-host/dbname" < backup.sql
```

---

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Xem **Logs** trên Render Dashboard (tab Logs trong service)
2. Google thông báo lỗi
3. Liên hệ người phát triển

