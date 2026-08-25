/* =====================================================================
 *  사진 압축
 * =====================================================================
 *  폰 카메라 사진은 3~8MB쯤 된다. Firestore 문서 한도가 1MiB라 그대로는
 *  못 넣는다. 그래서 브라우저에서 작게 줄이고 JPEG로 다시 굽는다.
 *
 *  Cloud Storage를 안 쓰는 이유
 *  ───────────────────────────────────────────────────────────────────
 *  이 프로젝트는 무료(Spark) 요금제다. 최근에 만들어진 Firebase 프로젝트는
 *  Cloud Storage를 쓰려면 Blaze(종량제)로 올려야 해서 카드 등록이 필요하다.
 *  부스용 썸네일 한 장이면 되니 Firestore 문서에 문자열로 넣는 편이 낫다.
 *
 *  세로로 찍은 사진이 눕는 문제
 *  ───────────────────────────────────────────────────────────────────
 *  폰 사진에는 회전 정보(EXIF)가 따로 붙어 있다. 캔버스에 그냥 그리면
 *  이걸 무시해서 사진이 옆으로 눕는다. createImageBitmap 의
 *  imageOrientation:'from-image' 로 회전을 미리 적용해서 받는다.
 * =====================================================================
 */

/** 압축 결과가 이 크기를 넘으면 품질을 낮춰 다시 굽는다 (문자 수 기준) */
const MAX_CHARS = 700000;

/** 원본 파일이 이보다 크면 아예 안 받는다. 브라우저가 뻗는 걸 막는다. */
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

/**
 * 파일을 회전까지 적용해 그릴 수 있는 형태로 읽는다.
 * @param {File} file
 * @returns {Promise<ImageBitmap|HTMLImageElement>}
 */
async function loadImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // imageOrientation 옵션을 모르는 브라우저 — 옵션 없이 한 번 더
      try {
        return await createImageBitmap(file);
      } catch {
        /* 아래 <img> 방식으로 내려간다 */
      }
    }
  }

  // 폴백: <img> 로 읽는다. 요즘 브라우저는 여기서도 EXIF 회전을 적용한다.
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 읽지 못했어요'));
    };
    img.src = url;
  });
}

/**
 * 사진을 정사각형으로 잘라 줄이고 JPEG data URL로 돌려준다.
 *
 * 화면에서 동그랗게 보여주므로 가운데를 정사각형으로 잘라낸다. 그래야
 * 세로 사진이 위아래로 눌리지 않는다.
 *
 * @param {File} file
 * @param {{size?: number, quality?: number}} opts
 * @returns {Promise<string>} 'data:image/jpeg;base64,...'
 */
export async function compressPhoto(file, { size = 480, quality = 0.72 } = {}) {
  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 넣을 수 있어요');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('사진이 너무 커요 (25MB 이하)');
  }

  const img = await loadImage(file);
  const w = img.width;
  const h = img.height;

  // 가운데 정사각형 영역
  const side = Math.min(w, h);
  const sx = (w - side) / 2;
  const sy = (h - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

  if (typeof img.close === 'function') img.close();

  // 품질을 낮춰가며 한도 안에 들어올 때까지 다시 굽는다
  let q = quality;
  let out = canvas.toDataURL('image/jpeg', q);
  while (out.length > MAX_CHARS && q > 0.3) {
    q -= 0.12;
    out = canvas.toDataURL('image/jpeg', q);
  }

  if (out.length > MAX_CHARS) {
    throw new Error('사진을 충분히 줄이지 못했어요. 다른 사진을 써주세요');
  }

  return out;
}
