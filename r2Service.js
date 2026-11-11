// Pure JavaScript Cloudflare R2 Upload Service with AWS SigV4
// Zero external dependencies - works seamlessly on Web, iOS, and Android (Expo SDK 58)

const R2_CONFIG = {
  accountId: process.env.EXPO_PUBLIC_R2_ACCOUNT_ID || '',
  bucketName: process.env.EXPO_PUBLIC_R2_BUCKET_NAME || 'gkitamphan',
  accessKeyId: process.env.EXPO_PUBLIC_R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.EXPO_PUBLIC_R2_SECRET_ACCESS_KEY || '',
  publicUrl: process.env.EXPO_PUBLIC_R2_PUBLIC_URL || ''
};

// Pure JS SHA256 (RFC 6234)
function sha256(data) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const l = bytes.length;

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let H0 = 0x6a09e667, H1 = 0xbb67ae85, H2 = 0x3c6ef372, H3 = 0xa54ff53a;
  let H4 = 0x510e527f, H5 = 0x9b05688c, H6 = 0x1f83d9ab, H7 = 0x5be0cd19;

  const bitLen = l * 8;
  const newLen = ((l + 8) >> 6) + 1;
  const words = new Uint32Array(newLen * 16);

  for (let i = 0; i < l; i++) {
    words[i >> 2] |= bytes[i] << ((3 - (i & 3)) * 8);
  }
  words[l >> 2] |= 0x80 << ((3 - (l & 3)) * 8);
  words[newLen * 16 - 2] = Math.floor(bitLen / 0x100000000);
  words[newLen * 16 - 1] = bitLen >>> 0;

  const W = new Uint32Array(64);

  for (let i = 0; i < words.length; i += 16) {
    for (let t = 0; t < 16; t++) {
      W[t] = words[i + t];
    }
    for (let t = 16; t < 64; t++) {
      const s0 = ((W[t - 15] >>> 7) | (W[t - 15] << 25)) ^ ((W[t - 15] >>> 18) | (W[t - 15] << 14)) ^ (W[t - 15] >>> 3);
      const s1 = ((W[t - 2] >>> 17) | (W[t - 2] << 15)) ^ ((W[t - 2] >>> 19) | (W[t - 2] << 13)) ^ (W[t - 2] >>> 10);
      W[t] = (((W[t - 16] + s0) | 0) + ((W[t - 7] + s1) | 0)) | 0;
    }

    let a = H0, b = H1, c = H2, d = H3, e = H4, f = H5, g = H6, h = H7;

    for (let t = 0; t < 64; t++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (((((h + S1) | 0) + ch) | 0) + ((K[t] + W[t]) | 0)) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    H0 = (H0 + a) | 0;
    H1 = (H1 + b) | 0;
    H2 = (H2 + c) | 0;
    H3 = (H3 + d) | 0;
    H4 = (H4 + e) | 0;
    H5 = (H5 + f) | 0;
    H6 = (H6 + g) | 0;
    H7 = (H7 + h) | 0;
  }

  const out = new Uint8Array(32);
  const hs = [H0, H1, H2, H3, H4, H5, H6, H7];
  for (let i = 0; i < 8; i++) {
    out[i * 4] = (hs[i] >>> 24) & 0xff;
    out[i * 4 + 1] = (hs[i] >>> 16) & 0xff;
    out[i * 4 + 2] = (hs[i] >>> 8) & 0xff;
    out[i * 4 + 3] = hs[i] & 0xff;
  }
  return out;
}

function toHex(uint8Array) {
  return Array.from(uint8Array).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hmacSha256(key, message) {
  let k = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const m = typeof message === 'string' ? new TextEncoder().encode(message) : message;

  if (k.length > 64) {
    k = sha256(k);
  }
  const kPadded = new Uint8Array(64);
  kPadded.set(k);

  const oKeyPad = new Uint8Array(64);
  const iKeyPad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    oKeyPad[i] = kPadded[i] ^ 0x5c;
    iKeyPad[i] = kPadded[i] ^ 0x36;
  }

  const innerMsg = new Uint8Array(64 + m.length);
  innerMsg.set(iKeyPad);
  innerMsg.set(m, 64);
  const innerHash = sha256(innerMsg);

  const outerMsg = new Uint8Array(64 + 32);
  outerMsg.set(oKeyPad);
  outerMsg.set(innerHash, 64);
  return sha256(outerMsg);
}

// Base64 decoder
function base64ToUint8Array(base64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = base64.replace(/=+$/, '');
  let output = [];

  for (let bc = 0, bs = 0, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
    bc++ % 4) ? output.push(255 & bs >> (-2 * bc & 6)) : 0
  ) {
    buffer = chars.indexOf(buffer);
  }

  return new Uint8Array(output);
}

/**
 * Uploads an image asset to Cloudflare R2 using AWS SigV4
 * @param {object} asset - ImagePicker asset object ({ uri, base64, mimeType, fileName })
 * @returns {Promise<string>} - The public image URL
 */
export async function uploadImageToR2(asset) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  const mimeType = asset.mimeType || 'image/jpeg';
  let ext = 'jpg';
  if (mimeType.includes('png')) ext = 'png';
  else if (mimeType.includes('webp')) ext = 'webp';

  const fileName = `product-${Date.now()}.${ext}`;
  const host = `${R2_CONFIG.accountId}.r2.cloudflarestorage.com`;
  const path = `/${R2_CONFIG.bucketName}/${fileName}`;
  const endpoint = `https://${host}${path}`;

  const method = 'PUT';
  const region = 'auto';
  const service = 's3';

  // SigV4 with UNSIGNED-PAYLOAD for efficient direct uploads
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalHeaders = `content-type:${mimeType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${toHex(sha256(canonicalRequest))}`;

  const kDate = hmacSha256('AWS4' + R2_CONFIG.secretAccessKey, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, 'aws4_request');
  const signature = toHex(hmacSha256(kSigning, stringToSign));

  const authHeader = `${algorithm} Credential=${R2_CONFIG.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  // Prepare binary body
  let bodyData;
  if (asset.base64) {
    bodyData = base64ToUint8Array(asset.base64);
  } else {
    const res = await fetch(asset.uri);
    bodyData = await res.blob();
  }

  const uploadRes = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Host': host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Content-Type': mimeType,
      'Authorization': authHeader
    },
    body: bodyData
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Upload Cloudflare R2 thất bại (${uploadRes.status}): ${errText || uploadRes.statusText}`);
  }

  const cleanPublicUrl = R2_CONFIG.publicUrl.replace(/\/+$/, '');
  return `${cleanPublicUrl}/${fileName}`;
}
