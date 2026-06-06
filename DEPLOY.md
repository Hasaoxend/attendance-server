# 🚀 Hướng Dẫn Deploy — Hệ Thống Điểm Danh Sinh Viên

> Hướng dẫn này dành cho **bất kỳ ai** nhận được source code và muốn tự deploy lên internet.
> Không cần kinh nghiệm DevOps. Chỉ cần làm theo từng bước.

---

## 📋 Bạn cần chuẩn bị gì?

| # | Cần gì | Link |
|---|--------|------|
| 1 | **Tài khoản GitHub** | [đăng ký miễn phí](https://github.com/signup) |
| 2 | **Tài khoản Render** | [đăng ký miễn phí](https://render.com) — nên dùng "Sign in with GitHub" |
| 3 | **Git** cài trên máy | [tải tại đây](https://git-scm.com/downloads) |
| 4 | **Node.js** (v18+) cài trên máy | [tải tại đây](https://nodejs.org) |

**Kiểm tra Git và Node đã cài chưa**: mở PowerShell (hoặc Terminal), gõ:
```
git --version
node --version
```
Nếu hiện ra số version (ví dụ `git version 2.45.0`, `v20.11.0`) → OK.
Nếu báo lỗi "không nhận ra lệnh" → cài lại theo link trên.

---

## 📦 Cấu trúc Source Code

Hệ thống gồm **2 repo riêng biệt** trên GitHub:

| Repo | Chứa gì | GitHub URL |
|------|---------|------------|
| `attendance-server` | Backend API (Node.js + Express + PostgreSQL) | `https://github.com/Hasaoxend/attendance-server` |
| `attendance-client` | Frontend giao diện (React + Vite + TypeScript) | `https://github.com/Hasaoxend/attendance-client` |

> Khi deploy, chỉ cần tạo **1 service duy nhất** từ repo `attendance-server`.
> Render sẽ tự động clone `attendance-client`, build, và nhúng vào server.

---

## BƯỚC 1: Fork repo về GitHub của bạn (nếu cần)

> Nếu bạn **đã là chủ repo** (tức username GitHub là `Hasaoxend`) → **bỏ qua bước này**, nhảy tới Bước 2.

Nếu bạn nhận source code từ người khác và muốn deploy dưới tài khoản GitHub của bạn:

### 1.1 — Fork repo Backend

1. Vào `https://github.com/Hasaoxend/attendance-server`
2. Nhấn nút **Fork** (góc phải trên)
3. Chọn tài khoản GitHub của bạn → nhấn **Create fork**
4. Bạn sẽ có repo: `https://github.com/TEN-CUA-BAN/attendance-server`

### 1.2 — Fork repo Frontend

1. Vào `https://github.com/Hasaoxend/attendance-client`
2. Nhấn nút **Fork** → **Create fork**
3. Bạn sẽ có repo: `https://github.com/TEN-CUA-BAN/attendance-client`

### 1.3 — Cập nhật build command (QUAN TRỌNG nếu fork)

Sau khi fork, cần sửa 1 dòng trong file `render.yaml` (trong repo `attendance-server`):

1. Vào repo `attendance-server` trên GitHub **của bạn**
2. Mở file `render.yaml`
3. Nhấn nút bút chì (Edit) 
4. Tìm dòng:
   ```
   git clone https://github.com/Hasaoxend/attendance-client.git _client &&
   ```
5. Đổi `Hasaoxend` thành **username GitHub của bạn**:
   ```
   git clone https://github.com/TEN-CUA-BAN/attendance-client.git _client &&
   ```
6. Nhấn **Commit changes**

> ⚠️ Nếu quên bước này, Render sẽ clone repo gốc thay vì repo fork của bạn.

---

## BƯỚC 2: Tạo Database trên Render

### 2.1 — Đăng nhập Render

1. Vào [dashboard.render.com](https://dashboard.render.com)
2. Nhấn **Sign in with GitHub** (nhanh nhất, nên dùng cách này)
3. Cho phép Render truy cập GitHub của bạn

### 2.2 — Tạo PostgreSQL Database

1. Trên Dashboard, nhấn nút **New +** (góc phải trên, nút màu xanh/tím)
2. Chọn **PostgreSQL** trong menu dropdown
3. Trang tạo database hiện ra. Điền **chính xác** như sau:

| Mục | Điền gì |
|-----|---------|
| **Name** | `attendance-db` |
| **Database** | `attendance_db` |
| **User** | Để nguyên mặc định (Render tự tạo) |
| **Region** | Chọn `Singapore (Southeast Asia)` ← gần Việt Nam nhất |
| **PostgreSQL Version** | Để nguyên mặc định |
| **Plan** | Kéo xuống cuối, chọn **Free** |

4. Nhấn nút **Create Database** (nút lớn ở cuối trang)
5. Chờ 1-2 phút. Khi trạng thái hiện **Available** (chữ xanh lá) → database đã sẵn sàng

### 2.3 — Lấy Database URL (quan trọng, cần cho bước sau)

1. Bạn đang ở trang thông tin database vừa tạo
2. Kéo xuống phần **Connections**
3. Tìm dòng **Internal Database URL**
   - Dạng: `postgresql://attendance_db_user:ABC123xyz@dpg-xxx.singapore-postgres.render.com/attendance_db`
4. Nhấn nút **Copy** 📋 bên cạnh dòng đó
5. **Mở Notepad**, paste vào đó và lưu lại — bạn sẽ cần paste chuỗi này ở Bước 3

> ⚠️ Copy dòng **Internal** Database URL (không phải External).
> Internal nhanh hơn vì giao tiếp nội bộ trong Render.

> ⚠️ Free database sẽ bị xóa sau **90 ngày**. Đủ cho demo/thực tập.

---

## BƯỚC 3: Deploy ứng dụng lên Render

### 3.1 — Tạo Web Service

1. Trên Render Dashboard, nhấn **New +** (góc phải trên) → chọn **Web Service**
2. Chọn **Build and deploy from a Git repository** → nhấn **Next**
3. Danh sách repo GitHub của bạn sẽ hiện ra
4. Tìm repo **`attendance-server`** trong danh sách
   - **Nếu không thấy repo**: nhấn link **Configure account** → trang GitHub mở ra → tick chọn repo `attendance-server` → nhấn **Save** → quay lại Render
5. Nhấn nút **Connect** bên cạnh repo `attendance-server`

### 3.2 — Cấu hình Web Service

Trang cấu hình hiện ra. Điền **chính xác** theo bảng dưới:

| Mục | Điền gì | Giải thích |
|-----|---------|------------|
| **Name** | `attendance-app` | Tên hiển thị trên Render |
| **Region** | `Singapore (Southeast Asia)` | Phải **cùng region** với database ở Bước 2 |
| **Branch** | `main` | Thường đã chọn sẵn |
| **Root Directory** | *(để trống)* | Vì đây là repo riêng, không phải monorepo |
| **Runtime** | `Node` | Chọn trong dropdown |
| **Build Command** | *(xem bên dưới)* | Copy nguyên đoạn |
| **Start Command** | `node index.js` | Gõ chính xác |
| **Plan** | `Free` | Kéo xuống chọn |

**Build Command** — copy **nguyên đoạn** này và paste vào ô Build Command:
```
npm install && git clone https://github.com/Hasaoxend/attendance-client.git _client && cd _client && npm install && npm run build && cd .. && cp -r _client/dist public
```

> ⚠️ Nếu bạn đã **fork** repo ở Bước 1, đổi `Hasaoxend` thành username GitHub **của bạn** trong đoạn trên.

> ⚠️ Copy **nguyên 1 dòng**, không ngắt dòng. Paste hết vào 1 ô.

### 3.3 — Thêm Environment Variables

Vẫn trong trang tạo service. Kéo xuống phần **Environment Variables**.

Nhấn **Add Environment Variable** rồi điền cho **từng dòng** dưới đây:

| Nhấn "Add" | Key (ô bên trái) | Value (ô bên phải) |
|-------------|-------------------|---------------------|
| Lần 1 | `NODE_ENV` | `production` |
| Lần 2 | `DATABASE_URL` | *(paste chuỗi dài đã copy ở Bước 2.3)* |
| Lần 3 | `JWT_SECRET` | Gõ chuỗi bí mật bất kỳ, ví dụ: `mySecretKey2024!@abc` |
| Lần 4 | `QR_SECRET` | Gõ chuỗi bí mật bất kỳ, ví dụ: `qrSecretXyz2024!@def` |

> 💡 **JWT_SECRET** và **QR_SECRET** là "chìa khóa bí mật" của ứng dụng.
> Bạn tự nghĩ ra chuỗi bất kỳ (ít nhất 16 ký tự, pha lẫn chữ + số + ký tự đặc biệt).
> Ví dụ: `diemDanh_sv_2024!@#` — miễn sao không để lộ cho ai.

### 3.4 — Nhấn Deploy!

1. Kiểm tra lại tất cả thông tin đã điền
2. Nhấn nút **Create Web Service** (nút lớn ở cuối trang)
3. Render bắt đầu build. Bạn sẽ thấy **log chạy trên màn hình** (chữ trắng trên nền đen)

**Chờ 3-5 phút.** Quá trình build gồm:
```
==> Installing dependencies (npm install)        ← Cài backend
==> Cloning attendance-client                     ← Tải frontend 
==> Installing frontend dependencies              ← Cài frontend
==> Building frontend (vite build)                ← Build React
==> Copying dist to public                        ← Copy vào server
==> Starting server (node index.js)               ← Khởi động!
```

4. **Deploy thành công** khi bạn thấy dòng log:
   ```
   Server is running on port 10000
   [DB] Schema ensured
   ```
   
5. Trạng thái ở đầu trang chuyển thành **Live** (chữ xanh lá) 🎉

> ❌ Nếu thấy lỗi đỏ → xem phần **Xử lý lỗi thường gặp** ở cuối trang.

### 3.5 — Lấy URL ứng dụng

Sau khi deploy thành công:
1. Nhìn phần **đầu trang** Web Service, ngay dưới tên service
2. Bạn sẽ thấy URL dạng: `https://attendance-app-xxxx.onrender.com`
3. Nhấn vào URL đó → mở tab mới → **thấy trang web** của bạn!
4. **Đây chính là link chia sẻ** — gửi cho ai cũng truy cập được

---

## BƯỚC 4: Tạo dữ liệu mẫu (để có tài khoản đăng nhập)

Lần đầu deploy, database hoàn toàn trống. Cần tạo dữ liệu mẫu.

### 4.1 — Mở Shell trên Render

1. Vào Render Dashboard → nhấn vào service **attendance-app**
2. Nhấn tab **Shell** (thanh tab phía trên, bên cạnh Logs, Events, Metrics...)
3. Chờ vài giây, terminal đen hiện ra với dấu `$`

### 4.2 — Chạy lệnh tạo dữ liệu

Gõ lệnh sau rồi nhấn Enter:
```bash
node seed.js
```

Chờ vài giây. Khi thấy:
```
--- Initializing Database (PostgreSQL) ---
Clearing old data...
Seeding users...
Seeding events...
--- Seeding completed successfully! ---
```
→ ✅ **Dữ liệu mẫu đã sẵn sàng!**

### 4.3 — Tài khoản để đăng nhập

| Vai trò | Username | Mật khẩu | Dùng để |
|---------|----------|-----------|---------|
| **Admin** | `admin` | `admin123` | Quản lý toàn bộ hệ thống |
| **Cán bộ Đoàn** | `union_officer` | `password123` | Tạo/quản lý sự kiện |
| **Sinh viên 1** | `student` | `password123` | Đăng ký + điểm danh sự kiện |
| **Sinh viên 2** | `student2` | `password123` | Test thêm |

---

## BƯỚC 5: Kiểm tra ứng dụng

Mở trình duyệt (Chrome, Edge...), thay `URL-CUA-BAN` bằng URL thật từ Bước 3.5:

### 5.1 — Test nhanh

| # | Làm gì | Expected |
|---|--------|----------|
| 1 | Vào `https://URL-CUA-BAN/api/health` | Thấy `{"status":"ok","timestamp":"..."}` |
| 2 | Vào `https://URL-CUA-BAN/` | Thấy trang đăng nhập |
| 3 | Đăng nhập: `admin` / `admin123` | Vào được dashboard admin |

### 5.2 — Test chức năng chính

| # | Chức năng | Cách test |
|---|-----------|-----------|
| 4 | Tạo sự kiện | Admin → Quản lý sự kiện → Tạo mới → Điền form → Lưu |
| 5 | Đăng ký sự kiện | Đăng xuất → đăng nhập `student` → Tìm sự kiện → Đăng ký |
| 6 | Điểm danh | Admin bật QR → Student scan QR |
| 7 | Xem báo cáo | Admin → Báo cáo / Thống kê |

---

## ⚡ Lưu ý quan trọng khi dùng Render Free

### 1. Server "ngủ" khi không ai dùng
- Free tier **tắt server sau 15 phút** không có ai truy cập
- Lần truy cập đầu tiên sau khi "ngủ": **chờ 30-60 giây** (server khởi động lại)
- Sau đó nhanh bình thường
- **Đây là bình thường**, không phải lỗi

### 2. File upload sẽ mất khi re-deploy
- Ảnh, file tải lên sẽ **bị xóa** khi Render re-deploy hoặc restart
- Cho mục đích demo/thực tập thì OK
- Muốn giữ lâu dài → cần dùng Cloudinary hoặc AWS S3

### 3. Database hết hạn sau 90 ngày
- Free database tự xóa sau 90 ngày
- Tạo database mới và chạy `node seed.js` lại là xong

### 4. Tự động deploy khi push code
- Mỗi lần push code lên branch `main` → Render **tự build và deploy lại** (mất 3-5 phút)
- Không cần vào Dashboard bấm gì

---

## 🔧 Xử lý lỗi thường gặp

### ❌ Lỗi "Build failed"
**Nguyên nhân**: Build Command sai, hoặc repo client không truy cập được.
**Cách sửa**:
1. Kiểm tra Build Command copy đúng y nguyên (1 dòng, không ngắt)
2. Đảm bảo repo `attendance-client` là **Public** trên GitHub
3. Nếu repo Private → cần dùng token: `git clone https://TOKEN@github.com/...`

### ❌ Lỗi "SASL: password must be a string"
**Nguyên nhân**: `DATABASE_URL` chưa set hoặc sai.
**Cách sửa**:
1. Vào Render → Service → **Environment** tab
2. Kiểm tra key `DATABASE_URL` đã paste đúng **Internal** Database URL
3. Nhấn **Save Changes** → service tự restart

### ❌ Trang trắng hoặc "Cannot GET /"
**Nguyên nhân**: FE chưa build hoặc chưa copy vào `public/`.
**Cách sửa**: Xem log build, tìm dòng lỗi ở phần `npm run build` hoặc `cp -r`.

### ❌ API trả 500 Internal Server Error
**Nguyên nhân**: DB chưa có tables (chưa seed).
**Cách sửa**: Vào Shell tab, chạy `node seed.js`.

---

## 💻 Chạy trên máy cá nhân (cho developer)

Nếu muốn chạy local để phát triển thêm:

### Cài đặt PostgreSQL trên máy
1. Tải [PostgreSQL](https://www.postgresql.org/download/) và cài
2. Mở pgAdmin → tạo database `student_system`

### Chạy Backend
```powershell
cd attendance-server
copy .env.example .env
# Mở file .env bằng Notepad, sửa DB_PASS = mật khẩu PostgreSQL của bạn
npm install
npm run dev
```

### Chạy Frontend
```powershell
cd attendance-client
npm install
npm run dev
```

### Truy cập
- **Frontend**: `http://localhost:5173` (tự proxy API tới backend)
- **Backend API**: `http://localhost:5000/api`

---

## 📦 Backup Database (nếu cần)

Trước khi database hết hạn 90 ngày:

```bash
# Trên máy cá nhân (cần cài PostgreSQL client)
# Lấy External Database URL từ Render Dashboard
pg_dump "postgresql://user:pass@host/dbname" > backup.sql

# Restore vào database mới
psql "postgresql://user:pass@new-host/dbname" < backup.sql
```

---

## 🔄 Cập nhật ứng dụng

Khi có code mới:

```powershell
# Trong thư mục attendance-server
git add .
git commit -m "mô tả thay đổi"
git push

# Render tự động re-deploy (3-5 phút)
```

Nếu code frontend thay đổi → push ở repo `attendance-client`:
```powershell
# Trong thư mục attendance-client
git add .
git commit -m "mô tả thay đổi"  
git push

# Sau đó vào Render Dashboard → service → nhấn "Manual Deploy" → "Deploy latest commit"
# (vì Render chỉ watch repo server, không tự detect thay đổi ở repo client)
```

---

## 📞 Liên hệ hỗ trợ

Nếu gặp vấn đề:
1. Xem **Logs** trên Render Dashboard (tab Logs trong service)
2. Google thông báo lỗi kèm "Render.com"
3. Liên hệ người phát triển
