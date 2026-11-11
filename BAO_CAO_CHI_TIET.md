# BÁO CÁO GIỮA KỲ MÔN: LẬP TRÌNH ĐA NỀN TẢNG
**Đề tài:** Ứng dụng Quản lý sản phẩm phân hệ Admin (Web & Mobile)
- **Công nghệ:** React Native (Expo SDK 58)
- **Cơ sở dữ liệu:** Firebase Realtime Database (`https://quan-ly-san-pham-c8d02-default-rtdb.asia-southeast1.firebasedatabase.app/`)
- **Cấu trúc trường dữ liệu (ĐÚNG 4 TRƯỜNG):** `name`, `price`, `soluong`, `image`
- **Định dạng mã sản phẩm:** `product-01`, `product-02`, `product-03`,...

---

## 1. CÁC BƯỚC THỰC HIỆN VÀ LỆNH TẢI THƯ VIỆN

### Bước 1: Khởi tạo dự án
```bash
npx create-expo-app quan-ly-san-pham
cd quan-ly-san-pham
```

### Bước 2: Cài đặt các thư viện liên quan
1. Kết nối Firebase Realtime Database:
```bash
npm install firebase
```
2. Thư viện chọn hình ảnh & chia sẻ file trên thiết bị di động:
```bash
npx expo install expo-image-picker expo-file-system expo-sharing
```
3. Thư viện hỗ trợ hiển thị trên nền tảng Web:
```bash
npx expo install react-dom react-native-web @expo/metro-runtime
```

### Bước 3: Lệnh khởi chạy ứng dụng
- Chạy trên nền tảng Web:
```bash
npm run web
```
- Chạy trên nền tảng Mobile (Expo Go):
```bash
npx expo start
```

---

## 2. THIẾT KẾ CƠ SỞ DỮ LIỆU (CHUẨN 4 TRƯỜNG QUY ĐỊNH)

Cơ sở dữ liệu Firebase Realtime Database tại nhánh `products` chỉ chứa đúng 4 trường bắt buộc:
- `name`: Tên sản phẩm.
- `price`: Giá bán sản phẩm.
- `soluong`: Số lượng tồn kho.
- `image`: Đường link CDN hình ảnh lưu trữ trên Cloudflare R2 (`https://pub-82ad1e9e3e5249daba6977b2baf4114e.r2.dev/...`) hoặc đường link trực tiếp / Google Drive CDN.

File dữ liệu `database.json` (gồm 14 sản phẩm mẫu từ `product-01` đến `product-14`):
```json
{
  "products": {
    "product-01": {
      "name": "iPhone 16 Pro Max 256GB",
      "price": "34990000",
      "soluong": "15",
      "image": "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=300"
    },
    "product-02": {
      "name": "MacBook Air M3 13 inch",
      "price": "27990000",
      "soluong": "8",
      "image": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300"
    }
  }
}
```

---

## 3. CÁC TÍNH NĂNG ĐÃ TRIỂN KHAI TRONG HỆ THỐNG

1. **Quản trị sản phẩm (CRUD) với mã tuần tự:**
   - Tự động sinh mã định danh `product-01`, `product-02`,..., `product-14` khi thêm mới.
   - Đảm bảo 100% chỉ lưu đúng 4 trường (`name`, `price`, `soluong`, `image`) lên Firebase Realtime Database.
2. **Thanh trượt chọn giá & Lọc theo giá (`PriceSliderControl`):**
   - Thiết kế thanh trượt chọn mức giá từ **1.000.000 đ (1 triệu)** đến **100.000.000 đ (100 triệu)** với mỗi bước nhảy **5.000.000 đ (5 triệu)** kèm nút `−` / `+`.
   - Áp dụng đồng bộ tại **Form Thêm/Sửa sản phẩm** (chọn giá bán nhanh không cần nhập tay) và tại **Bộ lọc danh sách sản phẩm** (kéo thanh trượt để lọc sản phẩm theo mức giá trần).
3. **Tích hợp lưu trữ ảnh đám mây Cloudflare R2 (`r2Service.js`):**
   - Khi người dùng chọn ảnh từ máy tính hoặc điện thoại (`expo-image-picker`), hệ thống tự động ký xác thực chuẩn **AWS SigV4** và tải ảnh trực tiếp lên bucket `gkitamphan` của **Cloudflare R2**.
   - Nhận về đường link công khai `https://pub-82ad1e9e3e5249daba6977b2baf4114e.r2.dev/...` để lưu vào trường `image` trên Firebase.
   - Đồng thời vẫn hỗ trợ dán link ảnh trực tiếp hoặc tự động chuyển đổi link chia sẻ Google Drive sang Google CDN Direct Link.
4. **Tìm kiếm, Sắp xếp đa tiêu chí & Phân trang:**
   - Tìm kiếm tức thì (Live Search) theo Tên sản phẩm, Mã sản phẩm hoặc Giá bán.
   - Sắp xếp tăng/giảm theo 3 tiêu chí: **Tên sản phẩm (A-Z / Z-A)**, **Giá bán (Tăng / Giảm)**, **Số lượng tồn kho (Tăng / Giảm)**.
   - Phân trang hiển thị 5 sản phẩm/trang.
5. **Tiện ích nâng cao:**
   - Ngừng bán / Mở bán lại sản phẩm, Thao tác hàng loạt (Chọn tất cả trang, Ngừng bán mục chọn, Xóa vĩnh viễn mục chọn).
   - Chuyển đổi giao diện **Chế độ Sáng / Tối (Light / Dark Mode)**.
   - Xuất toàn bộ CSDL ra file `database.json` trên cả Web và Mobile (`expo-file-system/next` & `expo-sharing`).
