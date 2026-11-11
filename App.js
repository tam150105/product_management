import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Paths, File } from 'expo-file-system/next';
import * as Sharing from 'expo-sharing';
import {
  ref,
  onValue,
  set,
  update,
  remove,
} from 'firebase/database';
import { db } from './firebaseConfig';
import { uploadImageToR2 } from './r2Service';

const PAGE_SIZE = 5;

// Mốc thanh trượt giá: Min 1 triệu, Max 100 triệu, mỗi bước nhảy 5 triệu
const PRICE_STEPS = [
  1000000,
  5000000,
  10000000,
  15000000,
  20000000,
  25000000,
  30000000,
  35000000,
  40000000,
  45000000,
  50000000,
  55000000,
  60000000,
  65000000,
  70000000,
  75000000,
  80000000,
  85000000,
  90000000,
  95000000,
  100000000,
];

// Component Thanh trượt chọn giá (1 triệu -> 100 triệu, bước nhảy 5 triệu) chạy mượt trên cả Web & Mobile
function PriceSliderControl({ value, onChange, theme }) {
  const [trackWidth, setTrackWidth] = useState(0);

  const numVal = Number(String(value).replace(/[^0-9.-]+/g, '')) || 1000000;
  let stepIdx = 0;
  let minDiff = Math.abs(PRICE_STEPS[0] - numVal);
  for (let i = 1; i < PRICE_STEPS.length; i++) {
    const diff = Math.abs(PRICE_STEPS[i] - numVal);
    if (diff < minDiff) {
      minDiff = diff;
      stepIdx = i;
    }
  }

  const percent = (stepIdx / (PRICE_STEPS.length - 1)) * 100;

  const handleTouchX = (locX) => {
    if (!trackWidth || trackWidth <= 0) return;
    const ratio = Math.max(0, Math.min(1, locX / trackWidth));
    const idx = Math.round(ratio * (PRICE_STEPS.length - 1));
    onChange(PRICE_STEPS[idx]);
  };

  const stepDown = () => {
    if (stepIdx > 0) onChange(PRICE_STEPS[stepIdx - 1]);
  };

  const stepUp = () => {
    if (stepIdx < PRICE_STEPS.length - 1) onChange(PRICE_STEPS[stepIdx + 1]);
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity
          onPress={stepDown}
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            backgroundColor: theme.btnSecondaryBg,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.textPrimary }}>−</Text>
        </TouchableOpacity>

        <View
          style={{
            flex: 1,
            height: 34,
            justifyContent: 'center',
            position: 'relative',
          }}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => handleTouchX(e.nativeEvent.locationX)}
          onResponderMove={(e) => handleTouchX(e.nativeEvent.locationX)}
        >
          {/* Thanh nền */}
          <View
            pointerEvents="none"
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: theme.border,
              width: '100%',
              overflow: 'hidden',
            }}
          >
            {/* Thanh màu theo vị trí chọn */}
            <View
              style={{
                height: '100%',
                width: `${percent}%`,
                backgroundColor: '#2563eb',
                borderRadius: 4,
              }}
            />
          </View>

          {/* Nút tròn kéo (Thumb) */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: `${percent}%`,
              marginLeft: -10,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: '#2563eb',
              borderWidth: 2.5,
              borderColor: '#ffffff',
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 3,
              elevation: 3,
            }}
          />

          {/* Input range native cho trình duyệt Web để kéo chuột siêu mượt */}
          {Platform.OS === 'web' &&
            React.createElement('input', {
              type: 'range',
              min: 0,
              max: PRICE_STEPS.length - 1,
              step: 1,
              value: stepIdx,
              onChange: (e) => onChange(PRICE_STEPS[Number(e.target.value)]),
              style: {
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
                margin: 0,
              },
            })}
        </View>

        <TouchableOpacity
          onPress={stepUp}
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            backgroundColor: theme.btnSecondaryBg,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.textPrimary }}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Nhãn mốc giá bên dưới thanh trượt */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 38,
          marginTop: 2,
        }}
      >
        <Text style={{ fontSize: 11, color: theme.textSecondary }}>1tr</Text>
        <Text style={{ fontSize: 11, color: theme.textSecondary }}>25tr</Text>
        <Text style={{ fontSize: 11, color: theme.textSecondary }}>50tr</Text>
        <Text style={{ fontSize: 11, color: theme.textSecondary }}>75tr</Text>
        <Text style={{ fontSize: 11, color: theme.textSecondary }}>100tr</Text>
      </View>
    </View>
  );
}

export default function App() {
  // NÂNG CAO: Chế độ sáng / tối (Dark Mode / Light Mode)
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Authentication state (Đăng nhập Admin)
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('admin@gmail.com');
  const [loginPassword, setLoginPassword] = useState('123456');
  const [loginError, setLoginError] = useState('');

  // Danh sách sản phẩm (CHỈ ĐÚNG 4 TRƯỜNG TRONG CSDL: name, price, soluong, image)
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form state (Thêm / Sửa sản phẩm - Đúng 4 trường: name, price, soluong, image)
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('10000000');
  const [soluong, setSoluong] = useState('');
  const [image, setImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // NÂNG CAO 1: NGỪNG BÁN / KHÓA SẢN PHẨM (Lưu trong State, không thêm cột vào Firebase)
  const [disabledProductIds, setDisabledProductIds] = useState([]);

  // NÂNG CAO 2: Tìm kiếm (Tên, Mã, Giá & Thanh trượt lọc giá) & Sắp xếp đa tiêu chí (Tên, Giá, Số lượng)
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('100000000');
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'price' | 'soluong'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  // NÂNG CAO 3: Phân trang (Pagination)
  const [currentPage, setCurrentPage] = useState(1);

  // NÂNG CAO 4: Thao tác hàng loạt (Bulk Actions)
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  // NÂNG CAO 5: Xem chi tiết sản phẩm (Modal)
  const [viewingProduct, setViewingProduct] = useState(null);

  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev));
    }, 3000);
  };

  // Định dạng tiền tệ VNĐ để hiển thị đẹp mắt
  const formatCurrency = (val) => {
    const num = Number(String(val).replace(/[^0-9.-]+/g, ''));
    if (isNaN(num)) return val;
    return num.toLocaleString('vi-VN') + ' đ';
  };

  // Hệ màu chủ đề động Sáng / Tối
  const theme = useMemo(() => {
    if (isDarkMode) {
      return {
        bg: '#0f172a',
        cardBg: '#1e293b',
        border: '#334155',
        textPrimary: '#f8fafc',
        textSecondary: '#94a3b8',
        inputBg: '#0f172a',
        headerBg: '#1e293b',
        btnSecondaryBg: '#334155',
        btnSecondaryText: '#cbd5e1',
        rowBorder: '#334155',
        statBoxBg: '#1e293b',
      };
    }
    return {
      bg: '#f8fafc',
      cardBg: '#ffffff',
      border: '#e2e8f0',
      textPrimary: '#0f172a',
      textSecondary: '#64748b',
      inputBg: '#ffffff',
      headerBg: '#ffffff',
      btnSecondaryBg: '#f1f5f9',
      btnSecondaryText: '#475569',
      rowBorder: '#f1f5f9',
      statBoxBg: '#ffffff',
    };
  }, [isDarkMode]);

  // Danh sách 14 sản phẩm mẫu (4 sản phẩm gốc + 10 sản phẩm bổ sung) chuẩn 4 trường
  const SAMPLE_PRODUCTS = {
    'product-01': {
      name: 'iPhone 16 Pro Max 256GB',
      price: '34990000',
      soluong: '15',
      image: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=300',
    },
    'product-02': {
      name: 'MacBook Air M3 13 inch',
      price: '27990000',
      soluong: '8',
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300',
    },
    'product-03': {
      name: 'Tai nghe AirPods Pro 2 USB-C',
      price: '5990000',
      soluong: '25',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300',
    },
    'product-04': {
      name: 'Đồng hồ Apple Watch Series 10',
      price: '10990000',
      soluong: '12',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300',
    },
    'product-05': {
      name: 'Samsung Galaxy S24 Ultra 512GB',
      price: '31490000',
      soluong: '10',
      image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=300',
    },
    'product-06': {
      name: 'iPad Pro M4 11 inch WiFi',
      price: '26990000',
      soluong: '14',
      image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300',
    },
    'product-07': {
      name: 'Bàn phím cơ Logitech MX Mechanical',
      price: '3890000',
      soluong: '30',
      image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300',
    },
    'product-08': {
      name: 'Chuột không dây Logitech MX Master 3S',
      price: '2490000',
      soluong: '42',
      image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=300',
    },
    'product-09': {
      name: 'Loa Bluetooth Marshall Stanmore III',
      price: '9490000',
      soluong: '7',
      image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300',
    },
    'product-10': {
      name: 'Máy ảnh Sony Alpha A6700 Mirrorless',
      price: '35990000',
      soluong: '5',
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300',
    },
    'product-11': {
      name: 'Màn hình LG UltraGear 27 inch 2K 180Hz',
      price: '6790000',
      soluong: '18',
      image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=300',
    },
    'product-12': {
      name: 'Tai nghe chụp tai Sony WH-1000XM5',
      price: '7490000',
      soluong: '22',
      image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=300',
    },
    'product-13': {
      name: 'Máy chơi game PlayStation 5 Slim',
      price: '13490000',
      soluong: '9',
      image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=300',
    },
    'product-14': {
      name: 'Ổ cứng di động SSD Samsung T7 1TB',
      price: '2690000',
      soluong: '35',
      image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=300',
    },
  };

  // ĐỒNG BỘ TRỰC TIẾP 100% VỚI FIREBASE REALTIME DATABASE
  useEffect(() => {
    if (!db) return;

    let seededOnce = false;
    setLoading(true);
    const productsRef = ref(db, 'products');
    const unsubscribe = onValue(
      productsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const parsed = Object.entries(data).map(([id, val]) => ({
            id,
            name: val.name || '',
            price: String(val.price ?? ''),
            soluong: String(val.soluong ?? ''),
            image: val.image || '',
          }));
          setProducts(parsed);

          // Tự động bổ sung đủ 14 sản phẩm mẫu vào Firebase lần đầu nếu hiện tại ít hơn 10 SP
          if (!seededOnce && parsed.length < 10) {
            seededOnce = true;
            const missing = {};
            Object.entries(SAMPLE_PRODUCTS).forEach(([k, v]) => {
              if (!data[k]) {
                missing[k] = v;
              }
            });
            if (Object.keys(missing).length > 0) {
              update(ref(db, 'products'), missing).catch(() => {});
            }
          } else {
            seededOnce = true;
          }
        } else {
          setProducts([]);
          if (!seededOnce) {
            seededOnce = true;
            set(ref(db, 'products'), SAMPLE_PRODUCTS).catch(() => {});
          }
        }
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        showToast('Lỗi tải Firebase: ' + error.message);
      }
    );

    return () => unsubscribe();
  }, []);

  // Nạp lại bộ sản phẩm mẫu lên Firebase
  const handleSeedFirebase = async () => {
    if (!db) return;
    try {
      await update(ref(db, 'products'), SAMPLE_PRODUCTS);
      showToast('Đã nạp bổ sung đủ danh sách sản phẩm mẫu lên Firebase!');
    } catch (err) {
      alert('Lỗi nạp mẫu: ' + err.message);
    }
  };

  // ĐĂNG NHẬP ADMIN
  const handleLogin = () => {
    setLoginError('');
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Vui lòng nhập email và mật khẩu');
      return;
    }

    if (
      loginEmail.trim().toLowerCase() === 'admin@gmail.com' &&
      loginPassword.trim() === '123456'
    ) {
      setCurrentUser({
        email: 'admin@gmail.com',
        hoten: 'Quản trị viên Kho',
      });
    } else {
      setLoginError('Tài khoản hoặc mật khẩu không chính xác (Mặc định: admin@gmail.com / 123456)');
    }
  };

  // Chọn ảnh từ thiết bị và tải lên Cloudflare R2
  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted' && Platform.OS !== 'web') {
        alert('Cần cấp quyền truy cập ảnh trên thiết bị');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingImage(true);
        showToast('Đang tải ảnh lên Cloudflare R2...');
        try {
          const publicUrl = await uploadImageToR2(asset);
          setImage(publicUrl);
          showToast('Đã tải ảnh lên Cloudflare R2 thành công!');
        } catch (uploadErr) {
          console.error('R2 upload error:', uploadErr);
          alert('Lỗi tải ảnh lên Cloudflare R2: ' + (uploadErr.message || uploadErr));
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (err) {
      setUploadingImage(false);
      alert('Lỗi chọn ảnh: ' + err.message);
    }
  };

  // Chuẩn hóa link ảnh Google Drive sang CDN trực tiếp
  const formatImageUrl = (url) => {
    if (!url) return '';
    const trimmed = url.trim();
    const driveMatch =
      trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
    }
    return trimmed;
  };

  // Tạo key tuần tự: product-01, product-02, ... product-05
  const getNextProductKey = () => {
    let maxNum = 0;
    products.forEach((p) => {
      if (p.id) {
        const match = p.id.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    const nextNum = maxNum + 1;
    const formatted = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    return `product-${formatted}`;
  };

  // Lưu sản phẩm (CHỈ ĐÚNG 4 TRƯỜNG CSDL: name, price, soluong, image)
  const handleSaveProduct = async () => {
    if (!name.trim() || !price.trim() || !soluong.trim()) {
      alert('Vui lòng điền đầy đủ Tên sản phẩm, Giá và Số lượng');
      return;
    }

    const payload = {
      name: name.trim(),
      price: price.trim(),
      soluong: soluong.trim(),
      image:
        formatImageUrl(image) ||
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300',
    };

    try {
      if (db) {
        if (editingId) {
          await update(ref(db, `products/${editingId}`), payload);
          showToast(`Cập nhật thành công (${editingId})`);
        } else {
          const nextKey = getNextProductKey();
          await set(ref(db, `products/${nextKey}`), payload);
          showToast(`Đã thêm sản phẩm mới (${nextKey})`);
        }
      }
      resetForm();
    } catch (err) {
      alert('Lỗi lưu Firebase: ' + err.message);
    }
  };

  const handleEdit = (prod) => {
    setEditingId(prod.id);
    setName(prod.name);
    setPrice(String(prod.price));
    setSoluong(String(prod.soluong));
    setImage(prod.image);
  };

  // Ngừng bán / Mở bán lại sản phẩm
  const toggleDisableProduct = (prod) => {
    if (disabledProductIds.includes(prod.id)) {
      setDisabledProductIds((prev) => prev.filter((id) => id !== prod.id));
      showToast(`Đã mở bán lại "${prod.name}"`);
    } else {
      setDisabledProductIds((prev) => [...prev, prod.id]);
      showToast(`Đã tạm ngừng bán "${prod.name}"`);
    }
  };

  // Xóa vĩnh viễn khỏi Firebase
  const handleDeletePermanent = async (prod) => {
    const confirmDelete =
      Platform.OS === 'web'
        ? window.confirm(
            `Bạn có chắc chắn muốn XÓA VĨNH VIỄN sản phẩm "${prod.name}" khỏi CSDL?`
          )
        : true;

    if (!confirmDelete) return;

    try {
      if (db) {
        await remove(ref(db, `products/${prod.id}`));
      }
      showToast(`Đã xóa vĩnh viễn "${prod.name}"`);
      if (editingId === prod.id) resetForm();
      setSelectedProductIds((prev) => prev.filter((id) => id !== prod.id));
      setDisabledProductIds((prev) => prev.filter((id) => id !== prod.id));
    } catch (err) {
      alert('Lỗi khi xóa: ' + err.message);
    }
  };

  // Xóa hàng loạt
  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    const confirmBulk =
      Platform.OS === 'web'
        ? window.confirm(
            `Bạn có chắc muốn XÓA VĨNH VIỄN ${selectedProductIds.length} sản phẩm đã chọn khỏi CSDL?`
          )
        : true;
    if (!confirmBulk) return;

    try {
      for (const id of selectedProductIds) {
        if (db) {
          await remove(ref(db, `products/${id}`));
        }
      }
      showToast(`Đã xóa vĩnh viễn ${selectedProductIds.length} sản phẩm`);
      setSelectedProductIds([]);
    } catch (err) {
      alert('Lỗi xóa: ' + err.message);
    }
  };

  // Ngừng bán hàng loạt
  const handleBulkDisable = () => {
    if (selectedProductIds.length === 0) return;
    setDisabledProductIds((prev) =>
      Array.from(new Set([...prev, ...selectedProductIds]))
    );
    showToast(`Đã ngừng bán ${selectedProductIds.length} sản phẩm`);
    setSelectedProductIds([]);
  };

  const toggleSelectProduct = (id) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPrice('10000000');
    setSoluong('');
    setImage('');
  };

  // Xuất file JSON chuẩn 4 trường (name, price, soluong, image)
  const handleExportJson = async () => {
    const exportObj = { products: {} };
    products.forEach((p, idx) => {
      const num = idx + 1;
      const key = p.id || `product-${num < 10 ? '0' + num : num}`;
      exportObj.products[key] = {
        name: p.name,
        price: p.price,
        soluong: p.soluong,
        image: p.image,
      };
    });
    const jsonStr = JSON.stringify(exportObj, null, 2);

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'database.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Đã tải xuống file database.json');
    } else {
      try {
        const file = new File(Paths.document, 'database.json');
        if (!file.exists) {
          file.create();
        }
        file.write(jsonStr);

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'application/json',
            dialogTitle: 'Lưu hoặc chia sẻ file database.json',
            UTI: 'public.json',
          });
          showToast('Đã xuất file database.json thành công!');
        } else {
          alert(`Đã lưu file tại:\n${file.uri}`);
        }
      } catch (err) {
        alert('Lỗi xuất file: ' + err.message);
      }
    }
  };

  // Lọc và Sắp xếp đa tiêu chí (Theo Tên, Mã SP, Giá, Khoảng giá & Sắp xếp Tên/Giá/Số lượng)
  const processedProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const cleanNumQ = q.replace(/[^0-9]/g, '');
    const minVal = minPrice.trim() ? Number(minPrice.replace(/[^0-9]/g, '')) : null;
    const maxVal = maxPrice.trim() ? Number(maxPrice.replace(/[^0-9]/g, '')) : null;

    return products
      .filter((p) => {
        const prodPrice = Number(String(p.price).replace(/[^0-9.-]+/g, '')) || 0;
        const rawPriceStr = String(p.price || '').replace(/[^0-9]/g, '');

        // Lọc theo từ khóa (tên sản phẩm, mã sản phẩm hoặc giá tiền)
        if (q) {
          const matchName = (p.name || '').toLowerCase().includes(q);
          const matchId = (p.id || '').toLowerCase().includes(q);
          const matchPriceText = String(p.price || '').toLowerCase().includes(q);
          const matchPriceNum = cleanNumQ.length > 0 && rawPriceStr.includes(cleanNumQ);
          if (!matchName && !matchId && !matchPriceText && !matchPriceNum) {
            return false;
          }
        }

        // Lọc theo khoảng giá tối thiểu (Giá từ)
        if (minVal !== null && !isNaN(minVal) && prodPrice < minVal) {
          return false;
        }

        // Lọc theo khoảng giá tối đa (Giá đến)
        if (maxVal !== null && !isNaN(maxVal) && prodPrice > maxVal) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price') {
          const priceA = Number(String(a.price).replace(/[^0-9.-]+/g, '')) || 0;
          const priceB = Number(String(b.price).replace(/[^0-9.-]+/g, '')) || 0;
          return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
        }
        if (sortBy === 'soluong') {
          const qtyA = Number(String(a.soluong).replace(/[^0-9.-]+/g, '')) || 0;
          const qtyB = Number(String(b.soluong).replace(/[^0-9.-]+/g, '')) || 0;
          return sortOrder === 'asc' ? qtyA - qtyB : qtyB - qtyA;
        }
        // Mặc định sắp xếp theo tên sản phẩm
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        if (sortOrder === 'asc') return nameA.localeCompare(nameB, 'vi');
        return nameB.localeCompare(nameA, 'vi');
      });
  }, [products, searchQuery, minPrice, maxPrice, sortBy, sortOrder]);

  // Tổng số lượng tồn kho của toàn bộ sản phẩm
  const totalStockQuantity = useMemo(() => {
    return products.reduce((sum, p) => {
      const q = Number(String(p.soluong).replace(/[^0-9.-]+/g, '')) || 0;
      return sum + q;
    }, 0);
  }, [products]);

  // Phân trang
  const totalPages = Math.ceil(processedProducts.length / PAGE_SIZE) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return processedProducts.slice(start, start + PAGE_SIZE);
  }, [processedProducts, currentPage]);

  const isAllCurrentSelected =
    paginatedProducts.length > 0 &&
    paginatedProducts.every((p) => selectedProductIds.includes(p.id));

  const toggleSelectAllCurrentPage = () => {
    if (isAllCurrentSelected) {
      setSelectedProductIds((prev) =>
        prev.filter((id) => !paginatedProducts.some((p) => p.id === id))
      );
    } else {
      const currentIds = paginatedProducts.map((p) => p.id);
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...currentIds])));
    }
  };

  // Hàm xử lý bấm chọn kiểu sắp xếp
  const handleSelectSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // ==========================================================================
  // GIAO DIỆN ĐĂNG NHẬP
  // ==========================================================================
  if (!currentUser) {
    return (
      <SafeAreaView style={[styles.loginWrapper, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        {/* Nút đổi giao diện Sáng / Tối */}
        <TouchableOpacity
          style={[
            styles.btnThemeToggleLogin,
            { backgroundColor: theme.cardBg, borderColor: theme.border },
          ]}
          onPress={() => setIsDarkMode(!isDarkMode)}
        >
          <Text style={{ fontSize: 14, color: theme.textPrimary, fontWeight: '600' }}>
            {isDarkMode ? '☀️ Chế độ Sáng' : '🌙 Chế độ Tối'}
          </Text>
        </TouchableOpacity>

        <View
          style={[
            styles.loginCard,
            { backgroundColor: theme.cardBg, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.appBrand, { color: theme.textPrimary }]}>
            Quản Lý Sản Phẩm
          </Text>
          <Text style={[styles.loginSub, { color: theme.textSecondary }]}>
            Đăng nhập vào hệ thống quản trị kho
          </Text>

          {loginError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{loginError}</Text>
            </View>
          ) : null}

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Email</Text>
          <TextInput
            style={[
              styles.fieldInput,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.border,
                color: theme.textPrimary,
              },
            ]}
            placeholder="admin@gmail.com"
            placeholderTextColor={theme.textSecondary}
            value={loginEmail}
            onChangeText={setLoginEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            Mật khẩu
          </Text>
          <TextInput
            style={[
              styles.fieldInput,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.border,
                color: theme.textPrimary,
              },
            ]}
            placeholder="Nhập mật khẩu"
            placeholderTextColor={theme.textSecondary}
            value={loginPassword}
            onChangeText={setLoginPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.btnLoginSubmit}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.btnLoginSubmitText}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================================================
  // GIAO DIỆN TRANG CHÍNH (ADMIN DASHBOARD QUẢN LÝ SẢN PHẨM)
  // ==========================================================================
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View
        style={[
          styles.appHeader,
          { backgroundColor: theme.headerBg, borderBottomColor: theme.border },
        ]}
      >
        <View style={styles.headerInfo}>
          <Text style={[styles.appHeaderTitle, { color: theme.textPrimary }]}>
            Quản Lý Sản Phẩm
          </Text>
          <Text style={[styles.appHeaderUser, { color: theme.textSecondary }]}>
            {currentUser.hoten} ({currentUser.email})
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[
              styles.btnThemeHeader,
              { backgroundColor: theme.btnSecondaryBg, borderColor: theme.border },
            ]}
            onPress={() => setIsDarkMode(!isDarkMode)}
          >
            <Text style={{ fontSize: 13, color: theme.textPrimary }}>
              {isDarkMode ? '☀️ Sáng' : '🌙 Tối'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.btnExport,
              { backgroundColor: theme.btnSecondaryBg, borderColor: theme.border },
            ]}
            onPress={handleExportJson}
          >
            <Text style={[styles.btnExportText, { color: theme.btnSecondaryText }]}>
              Xuất JSON
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnLogout}
            onPress={() => setCurrentUser(null)}
          >
            <Text style={styles.btnLogoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </View>

      {toastMsg ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.bodyScroll}>
        {/* DASHBOARD THỐNG KÊ KHO HÀNG */}
        <View style={styles.statGrid}>
          <View
            style={[
              styles.statBox,
              { backgroundColor: theme.statBoxBg, borderColor: theme.border },
            ]}
          >
            <Text style={styles.statValue}>{products.length}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Tổng mặt hàng
            </Text>
          </View>
          <View
            style={[
              styles.statBox,
              { backgroundColor: theme.statBoxBg, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.statValue, { color: '#16a34a' }]}>
              {totalStockQuantity}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Tổng số lượng tồn kho
            </Text>
          </View>
          <View
            style={[
              styles.statBox,
              { backgroundColor: theme.statBoxBg, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.statValue, { color: '#dc2626' }]}>
              {disabledProductIds.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Sản phẩm ngừng bán
            </Text>
          </View>
        </View>

        <View style={styles.layout}>
          {/* CỘT 1: FORM NHẬP / SỬA SẢN PHẨM (ĐÚNG 4 TRƯỜNG: name, price, soluong, image) */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.cardHeading, { color: theme.textPrimary }]}>
              {editingId ? `Cập nhật (${editingId})` : 'Thêm sản phẩm mới'}
            </Text>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Tên sản phẩm (name)
            </Text>
            <TextInput
              style={[
                styles.fieldInput,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                },
              ]}
              placeholder="VD: iPhone 16 Pro Max"
              placeholderTextColor={theme.textSecondary}
              value={name}
              onChangeText={setName}
            />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginBottom: 0 }]}>
                Giá bán VNĐ (price)
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563eb' }}>
                {Number(price || 1000000).toLocaleString('vi-VN')} đ (
                {Math.round(Number(price || 1000000) / 1000000)} triệu)
              </Text>
            </View>
            <PriceSliderControl
              value={price || '1000000'}
              onChange={(val) => setPrice(String(val))}
              theme={theme}
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Số lượng tồn kho (soluong)
            </Text>
            <TextInput
              style={[
                styles.fieldInput,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                },
              ]}
              placeholder="VD: 15"
              placeholderTextColor={theme.textSecondary}
              value={soluong}
              onChangeText={setSoluong}
              keyboardType="numeric"
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Hình ảnh (image)
            </Text>
            <View style={styles.imagePickerRow}>
              <TextInput
                style={[
                  styles.fieldInput,
                  {
                    flex: 1,
                    marginBottom: 0,
                    backgroundColor: theme.inputBg,
                    borderColor: theme.border,
                    color: theme.textPrimary,
                  },
                ]}
                placeholder="Link ảnh hoặc bấm chọn..."
                placeholderTextColor={theme.textSecondary}
                value={image}
                onChangeText={setImage}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.btnPickImg, uploadingImage && { opacity: 0.7 }]}
                onPress={handlePickImage}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.btnPickImgText}>Chọn ảnh</Text>
                )}
              </TouchableOpacity>
            </View>

            {image ? (
              <View style={styles.avatarPreview}>
                <Image
                  source={{ uri: formatImageUrl(image) }}
                  style={styles.previewImage}
                />
                <TouchableOpacity onPress={() => setImage('')}>
                  <Text style={styles.clearImgText}>Xóa ảnh</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  editingId ? { backgroundColor: '#d97706' } : {},
                ]}
                onPress={handleSaveProduct}
              >
                <Text style={styles.btnPrimaryText}>
                  {editingId ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
                </Text>
              </TouchableOpacity>

              {editingId && (
                <TouchableOpacity
                  style={[
                    styles.btnCancel,
                    { backgroundColor: theme.btnSecondaryBg },
                  ]}
                  onPress={resetForm}
                >
                  <Text
                    style={[styles.btnCancelText, { color: theme.btnSecondaryText }]}
                  >
                    Hủy
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Nút nạp nhanh 4 sản phẩm mẫu lên Firebase nếu CSDL đang trống */}
            {products.length === 0 && (
              <TouchableOpacity style={styles.btnSeed} onPress={handleSeedFirebase}>
                <Text style={styles.btnSeedText}>
                  Nạp nhanh 4 sản phẩm mẫu lên Firebase
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* CỘT 2: DANH SÁCH SẢN PHẨM & TÍNH NĂNG NÂNG CAO */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
            ]}
          >
            <View style={styles.listHeader}>
              <Text style={[styles.cardHeading, { color: theme.textPrimary, marginBottom: 0 }]}>
                Danh sách ({processedProducts.length})
              </Text>

              {/* BỘ NÚT SẮP XẾP ĐA TIÊU CHÍ: TÊN, GIÁ, SỐ LƯỢNG */}
              <View style={styles.sortGroup}>
                <TouchableOpacity
                  style={[
                    styles.btnSort,
                    { backgroundColor: theme.btnSecondaryBg, borderColor: theme.border },
                    sortBy === 'name' && styles.btnSortActive,
                  ]}
                  onPress={() => handleSelectSort('name')}
                >
                  <Text
                    style={[
                      styles.btnSortText,
                      { color: theme.textPrimary },
                      sortBy === 'name' && styles.btnSortTextActive,
                    ]}
                  >
                    Tên {sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.btnSort,
                    { backgroundColor: theme.btnSecondaryBg, borderColor: theme.border },
                    sortBy === 'price' && styles.btnSortActive,
                  ]}
                  onPress={() => handleSelectSort('price')}
                >
                  <Text
                    style={[
                      styles.btnSortText,
                      { color: theme.textPrimary },
                      sortBy === 'price' && styles.btnSortTextActive,
                    ]}
                  >
                    Giá {sortBy === 'price' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.btnSort,
                    { backgroundColor: theme.btnSecondaryBg, borderColor: theme.border },
                    sortBy === 'soluong' && styles.btnSortActive,
                  ]}
                  onPress={() => handleSelectSort('soluong')}
                >
                  <Text
                    style={[
                      styles.btnSortText,
                      { color: theme.textPrimary },
                      sortBy === 'soluong' && styles.btnSortTextActive,
                    ]}
                  >
                    SL {sortBy === 'soluong' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Tìm kiếm theo Tên, Mã SP hoặc Giá */}
            <TextInput
              style={[
                styles.fieldInput,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                  marginBottom: 8,
                },
              ]}
              placeholder="Tìm theo tên sản phẩm, mã SP hoặc mức giá..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setCurrentPage(1);
              }}
            />

            {/* Thanh trượt lọc giá (Min: 1 triệu - Max: 100 triệu, mỗi nấc 5 triệu) */}
            <View
              style={{
                padding: 10,
                borderRadius: 8,
                backgroundColor: theme.inputBg,
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary }}>
                  Lọc theo giá (1 triệu → {Math.round(Number(maxPrice || 100000000) / 1000000)} triệu)
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563eb' }}>
                    ≤ {Number(maxPrice || 100000000).toLocaleString('vi-VN')} đ
                  </Text>
                  {(searchQuery !== '' || (maxPrice && maxPrice !== '100000000')) && (
                    <TouchableOpacity
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 5,
                        backgroundColor: theme.btnSecondaryBg,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                      onPress={() => {
                        setSearchQuery('');
                        setMinPrice('');
                        setMaxPrice('100000000');
                        setCurrentPage(1);
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: theme.btnSecondaryText }}>
                        Đặt lại
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <PriceSliderControl
                value={maxPrice || '100000000'}
                onChange={(val) => {
                  setMaxPrice(String(val));
                  setCurrentPage(1);
                }}
                theme={theme}
              />
            </View>

            {/* THAO TÁC HÀNG LOẠT */}
            <View
              style={[styles.bulkBar, { borderBottomColor: theme.rowBorder }]}
            >
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={toggleSelectAllCurrentPage}
              >
                <View
                  style={[
                    styles.checkbox,
                    { borderColor: theme.border, backgroundColor: theme.cardBg },
                    isAllCurrentSelected && styles.checkboxActive,
                  ]}
                >
                  {isAllCurrentSelected && <Text style={styles.checkTick}>✓</Text>}
                </View>
                <Text style={[styles.bulkText, { color: theme.textSecondary }]}>
                  Chọn tất cả trang này
                </Text>
              </TouchableOpacity>

              {selectedProductIds.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={styles.btnBulkBan}
                    onPress={handleBulkDisable}
                  >
                    <Text style={styles.btnBulkBanText}>
                      Ngừng bán ({selectedProductIds.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnBulkDelete}
                    onPress={handleBulkDelete}
                  >
                    <Text style={styles.btnBulkDeleteText}>
                      Xóa vĩnh viễn ({selectedProductIds.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {loading ? (
              <ActivityIndicator
                size="small"
                color="#0284c7"
                style={{ margin: 20 }}
              />
            ) : paginatedProducts.length === 0 ? (
              <Text style={[styles.emptyNotice, { color: theme.textSecondary }]}>
                Cơ sở dữ liệu sản phẩm hiện đang trống. Hãy thêm mới hoặc bấm "Nạp nhanh 4 sản phẩm mẫu"!
              </Text>
            ) : (
              paginatedProducts.map((item) => {
                const isSelected = selectedProductIds.includes(item.id);
                const isDisabled = disabledProductIds.includes(item.id);

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.productRow,
                      { borderBottomColor: theme.rowBorder },
                      editingId === item.id && styles.rowEditing,
                      isSelected &&
                        (isDarkMode
                          ? { backgroundColor: '#1e3a8a' }
                          : styles.rowSelected),
                      isDisabled &&
                        (isDarkMode
                          ? { backgroundColor: '#450a0a' }
                          : styles.rowDisabled),
                    ]}
                  >
                    {/* Checkbox */}
                    <TouchableOpacity
                      onPress={() => toggleSelectProduct(item.id)}
                      style={styles.checkboxTouch}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: theme.border,
                            backgroundColor: theme.cardBg,
                          },
                          isSelected && styles.checkboxActive,
                        ]}
                      >
                        {isSelected && <Text style={styles.checkTick}>✓</Text>}
                      </View>
                    </TouchableOpacity>

                    {/* Ảnh sản phẩm */}
                    <TouchableOpacity onPress={() => setViewingProduct(item)}>
                      <Image
                        source={{
                          uri:
                            formatImageUrl(item.image) ||
                            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300',
                        }}
                        style={styles.productPic}
                      />
                    </TouchableOpacity>

                    {/* Thông tin sản phẩm */}
                    <View style={styles.productDetails}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          flexWrap: 'wrap',
                        }}
                      >
                        <TouchableOpacity onPress={() => setViewingProduct(item)}>
                          <Text
                            style={[
                              styles.productNameText,
                              { color: theme.textPrimary },
                              isDisabled && styles.productNameDisabled,
                            ]}
                          >
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                        {isDisabled && (
                          <View style={styles.disabledTag}>
                            <Text style={styles.disabledTagText}>NGỪNG BÁN</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.productPriceText}>
                        Giá: {formatCurrency(item.price)}
                      </Text>
                      <Text
                        style={[
                          styles.productQtyText,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Kho: {item.soluong} sp • Mã: {item.id}
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.rowButtons}>
                      <TouchableOpacity
                        style={styles.btnEdit}
                        onPress={() => handleEdit(item)}
                      >
                        <Text style={styles.btnEditText}>Sửa</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.btnBan,
                          isDisabled ? styles.btnUnban : {},
                        ]}
                        onPress={() => toggleDisableProduct(item)}
                      >
                        <Text
                          style={[
                            styles.btnBanText,
                            isDisabled ? styles.btnUnbanText : {},
                          ]}
                        >
                          {isDisabled ? 'Mở' : 'Khóa'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.btnDelete,
                          {
                            backgroundColor: theme.btnSecondaryBg,
                            borderColor: theme.border,
                          },
                        ]}
                        onPress={() => handleDeletePermanent(item)}
                      >
                        <Text
                          style={[
                            styles.btnDeleteText,
                            { color: theme.btnSecondaryText },
                          ]}
                        >
                          Xóa
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            {/* PHÂN TRANG */}
            {totalPages > 1 && (
              <View
                style={[
                  styles.paginationRow,
                  { borderTopColor: theme.rowBorder },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.pageBtn,
                    {
                      backgroundColor: theme.btnSecondaryBg,
                      borderColor: theme.border,
                    },
                    currentPage === 1 && styles.pageBtnDisabled,
                  ]}
                  disabled={currentPage === 1}
                  onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <Text style={[styles.pageBtnText, { color: theme.textPrimary }]}>
                    ‹ Trước
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.pageInfo, { color: theme.textSecondary }]}>
                  Trang {currentPage} / {totalPages}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.pageBtn,
                    {
                      backgroundColor: theme.btnSecondaryBg,
                      borderColor: theme.border,
                    },
                    currentPage === totalPages && styles.pageBtnDisabled,
                  ]}
                  disabled={currentPage === totalPages}
                  onPress={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                >
                  <Text style={[styles.pageBtnText, { color: theme.textPrimary }]}>
                    Sau ›
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* MODAL: XEM CHI TIẾT SẢN PHẨM */}
      <Modal visible={!!viewingProduct} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          {viewingProduct && (
            <View style={[styles.modalCard, { backgroundColor: theme.cardBg }]}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                Chi tiết sản phẩm
              </Text>
              <Image
                source={{
                  uri:
                    formatImageUrl(viewingProduct.image) ||
                    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300',
                }}
                style={styles.modalImage}
              />
              <View
                style={[styles.detailRow, { borderBottomColor: theme.rowBorder }]}
              >
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  Mã sản phẩm:
                </Text>
                <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
                  {viewingProduct.id}
                </Text>
              </View>
              <View
                style={[styles.detailRow, { borderBottomColor: theme.rowBorder }]}
              >
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  Tên sản phẩm:
                </Text>
                <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
                  {viewingProduct.name}
                </Text>
              </View>
              <View
                style={[styles.detailRow, { borderBottomColor: theme.rowBorder }]}
              >
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  Giá bán:
                </Text>
                <Text style={[styles.detailValue, { color: '#0284c7' }]}>
                  {formatCurrency(viewingProduct.price)}
                </Text>
              </View>
              <View
                style={[styles.detailRow, { borderBottomColor: theme.rowBorder }]}
              >
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  Số lượng tồn:
                </Text>
                <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
                  {viewingProduct.soluong} sản phẩm
                </Text>
              </View>
              <View
                style={[styles.detailRow, { borderBottomColor: theme.rowBorder }]}
              >
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  Trạng thái:
                </Text>
                <Text
                  style={[
                    styles.detailValue,
                    disabledProductIds.includes(viewingProduct.id)
                      ? { color: '#dc2626' }
                      : { color: '#16a34a' },
                  ]}
                >
                  {disabledProductIds.includes(viewingProduct.id)
                    ? 'Ngừng kinh doanh'
                    : 'Đang mở bán'}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.btnSecondary,
                  { marginTop: 16, backgroundColor: theme.btnSecondaryBg },
                ]}
                onPress={() => setViewingProduct(null)}
              >
                <Text
                  style={[
                    styles.btnSecondaryText,
                    { color: theme.btnSecondaryText },
                  ]}
                >
                  Đóng
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loginWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  btnThemeToggleLogin: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 48,
    right: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 10,
  },
  loginCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 8,
    padding: 24,
    borderWidth: 1,
  },
  btnLoginSubmit: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginTop: 6,
  },
  btnLoginSubmitText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  appBrand: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  loginSub: {
    fontSize: 14,
    marginBottom: 20,
  },
  appHeader: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop:
      Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 12,
  },
  headerInfo: {
    flex: 1,
  },
  appHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  appHeaderUser: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  btnThemeHeader: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  btnExport: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  btnExportText: {
    fontSize: 12,
    fontWeight: '600',
  },
  btnLogout: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
  },
  btnLogoutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b91c1c',
  },
  bodyScroll: {
    padding: 16,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  statBox: {
    flex: 1,
    minWidth: 130,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0284c7',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  layout: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 16,
    alignItems: 'flex-start',
  },
  card: {
    flex: 1,
    width: '100%',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 12,
  },
  imagePickerRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnPickImg: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 6,
  },
  btnPickImgText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  avatarPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  previewImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  clearImgText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  btnCancel: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    justifyContent: 'center',
  },
  btnCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  btnSeed: {
    marginTop: 14,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  btnSeedText: {
    color: '#15803d',
    fontSize: 13,
    fontWeight: '600',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  sortGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  btnSort: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
  },
  btnSortActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  btnSortText: {
    fontSize: 12,
    fontWeight: '600',
  },
  btnSortTextActive: {
    color: '#ffffff',
  },
  bulkBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 6,
    borderBottomWidth: 1,
    flexWrap: 'wrap',
    gap: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxTouch: {
    padding: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  checkTick: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  bulkText: {
    fontSize: 12,
  },
  btnBulkBan: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 4,
  },
  btnBulkBanText: {
    color: '#b45309',
    fontSize: 12,
    fontWeight: '600',
  },
  btnBulkDelete: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 4,
  },
  btnBulkDeleteText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  rowEditing: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  rowSelected: {
    backgroundColor: '#f0f9ff',
  },
  rowDisabled: {
    backgroundColor: '#fef2f2',
    opacity: 0.85,
  },
  productPic: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  productDetails: {
    flex: 1,
  },
  productNameText: {
    fontSize: 14,
    fontWeight: '600',
  },
  productNameDisabled: {
    textDecorationLine: 'line-through',
    color: '#991b1b',
  },
  disabledTag: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  disabledTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b91c1c',
  },
  productPriceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
    marginTop: 2,
  },
  productQtyText: {
    fontSize: 12,
    marginTop: 1,
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  btnEdit: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
  },
  btnEditText: {
    color: '#b45309',
    fontSize: 12,
    fontWeight: '600',
  },
  btnBan: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
  },
  btnBanText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  btnUnban: {
    backgroundColor: '#dcfce7',
  },
  btnUnbanText: {
    color: '#15803d',
  },
  btnDelete: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
  },
  btnDeleteText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pageInfo: {
    fontSize: 12,
  },
  emptyNotice: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 13,
  },
  toast: {
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  toastText: {
    color: '#ffffff',
    fontSize: 12,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  errorBannerText: {
    color: '#dc2626',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 8,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    alignSelf: 'center',
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  btnSecondary: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
