# 📦 Ứng Dụng Quản Lý Sản Phẩm Đa Nền Tảng (Product Management System)

Hệ thống quản lý sản phẩm & kho hàng chạy mượt mà trên cả **Web** và **Mobile (Android/iOS)**, xây dựng với **React Native (Expo SDK 58)** và đồng bộ dữ liệu thời gian thực thông qua **Firebase Realtime Database**.

---

## 🌟 Tính Năng Nổi Bật

### 1. Quản Trị Sản Phẩm Toàn Diện (CRUD)
- **Thêm mới sản phẩm:** Nhập thông tin mặt hàng với cơ chế tự động đánh mã tuần tự (`product-01`, `product-02`, `product-03`,...).
- **Thanh trượt chọn giá thông minh (`PriceSliderControl`):** Chọn mức giá bán bằng thanh trượt trực quan từ **1 triệu VNĐ đến 100 triệu VNĐ** (mỗi bước nhảy **5 triệu VNĐ**) kèm nút tăng/giảm nhanh `−` / `+` thay vì phải gõ tay nhiều chữ số.
- **Cập nhật & Chỉnh sửa:** Đổ dữ liệu tức thì lên form để chỉnh sửa Tên, Giá bán, Số lượng tồn kho, Hình ảnh và đồng bộ ngay lập tức lên Firebase.
- **Xóa vĩnh viễn:** Hỗ trợ xóa đơn lẻ hoặc xóa hàng loạt trực tiếp khỏi cơ sở dữ liệu.
- **Xem chi tiết:** Modal pop-up hiển thị đầy đủ thông tin mặt hàng, định dạng tiền tệ VNĐ và hình ảnh sản phẩm.

### 2. Tìm Kiếm Đa Năng, Thanh Trượt Lọc Giá, Sắp Xếp & Phân Trang
- **Thanh trượt lọc theo mức giá (1 triệu → 100 triệu):** Kéo thanh trượt theo từng nấc **5 triệu VNĐ** để lọc nhanh các mặt hàng có giá nằm trong khoảng mong muốn, kèm nút **Đặt lại** tiện lợi.
- **Tìm kiếm thời gian thực (Live Search):** Lọc ngay lập tức theo **Tên sản phẩm**, **Mã sản phẩm (`product-01`)** hoặc **Mức giá** khi đang gõ phím.
- **Sắp xếp theo 3 tiêu chí linh hoạt:**
  - **Theo Tên (`name`):** Sắp xếp bảng chữ cái tiếng Việt (A → Z hoặc Z → A).
  - **Theo Giá bán (`price`):** Sắp xếp từ Thấp → Cao hoặc Cao → Thấp.
  - **Theo Số lượng tồn kho (`soluong`):** Sắp xếp từ Ít → Nhiều hoặc Nhiều → Ít.
- **Phân trang (Pagination):** Chia nhỏ danh sách (5 sản phẩm/trang) với bộ điều hướng mượt mà.

### 3. Xử Lý Hình Ảnh Linh Hoạt & Lưu Trữ Đám Mây (Cloudflare R2)
- **Tải ảnh từ thiết bị lên Cloudflare R2:** Tích hợp bộ chọn ảnh (`expo-image-picker`) trên cả di động và máy tính, tự động xác thực bằng chữ ký **AWS SigV4** thuần JavaScript và tải ảnh trực tiếp lên **Cloudflare R2** bucket `gkitamphan`, lấy đường link CDN công khai (`https://pub-82ad1e9e3e5249daba6977b2baf4114e.r2.dev/...`) lưu vào trường `image` của Firebase.
- **Tự động tối ưu link Google Drive:** Tự động phát hiện và chuyển đổi link chia sẻ Google Drive sang **Google CDN Direct Link** (`lh3.googleusercontent.com`), không bị lỗi chặn hiển thị hình ảnh (CORS).
- **Hỗ trợ link ảnh trực tiếp:** Người dùng có thể dán trực tiếp bất kỳ URL hình ảnh nào từ internet vào ô nhập liệu.

### 4. Kiểm Soát Trạng Thái Bán Hàng & Thao Tác Hàng Loạt
- **Ngừng kinh doanh / Mở bán lại:** Cho phép tạm khóa (ngừng bán) sản phẩm chỉ với 1 click mà không làm mất dữ liệu trong CSDL.
- **Thao tác hàng loạt (Bulk Actions):** Tích hợp Checkbox ở từng sản phẩm và nút **"Chọn tất cả trang này"** để thực hiện **Ngừng bán hàng loạt** hoặc **Xóa vĩnh viễn hàng loạt**.

### 5. Trải Nghiệm Người Dùng (UI/UX)
- **Giao diện Sáng / Tối (Dark / Light Theme):** Nút chuyển đổi nhanh chế độ màu sáng/tối trên cả trang Đăng nhập và trang Quản trị.
- **Thống kê kho hàng (Dashboard):** Thẻ số liệu hiển thị trực quan: Tổng số mặt hàng, Tổng số lượng tồn kho, và Số sản phẩm ngừng bán.
- **Xuất dữ liệu CSDL (Export JSON):** Xuất toàn bộ cơ sở dữ liệu ra file `database.json` chuẩn 4 trường (`name`, `price`, `soluong`, `image`) trên cả Web và Mobile.

---

## 📋 Cấu Trúc Dữ Liệu Chuẩn

Mỗi sản phẩm trong Firebase Realtime Database được lưu trữ tại nhánh `products` với mã định danh `product-01`, `product-02`,... và gồm đúng 4 trường:

```json
{
  "products": {
    "product-01": {
      "name": "iPhone 16 Pro Max 256GB",
      "price": "34990000",
      "soluong": "15",
      "image": "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=300"
    }
  }
}
```
