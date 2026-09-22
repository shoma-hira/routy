export type PhotoDraftPhoto = {
  id: string;
  name: string;
  dataUrl: string;
  capturedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  parseError: string | null;
};

function readAscii(view: DataView, offset: number, length: number) {
  return new TextDecoder().decode(new Uint8Array(view.buffer, view.byteOffset + offset, length)).replace(/\0/g, "").trim();
}

function parseExif(file: File) {
  return new Promise<{ capturedAt: string | null; latitude: number | null; longitude: number | null }>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const bytes = new Uint8Array(reader.result as ArrayBuffer);
        if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return resolve({ capturedAt: null, latitude: null, longitude: null });
        let offset = 2;
        while (offset + 4 < bytes.length) {
          if (bytes[offset] !== 0xff) break;
          const marker = bytes[offset + 1];
          const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
          if (marker === 0xe1 && new TextDecoder().decode(bytes.slice(offset + 4, offset + 10)) === "Exif\0\0") {
            const view = new DataView(bytes.buffer, offset + 10);
            const little = view.getUint16(0, false) === 0x4949;
            const u16 = (p: number) => view.getUint16(p, little);
            const u32 = (p: number) => view.getUint32(p, little);
            if (u16(2) !== 0x2a) return resolve({ capturedAt: null, latitude: null, longitude: null });
            const ifd = u32(4);
            const readIfd = (at: number) => {
              const count = u16(at);
              const entries: Record<number, number> = {};
              for (let i = 0; i < count; i += 1) {
                const p = at + 2 + i * 12;
                entries[u16(p)] = p;
              }
              return entries;
            };
            const ifd0 = readIfd(ifd);
            let capturedAt: string | null = null;
            const exifPtr = ifd0[0x8769] ? u32(ifd0[0x8769] + 8) : null;
            if (exifPtr !== null) {
              const exif = readIfd(exifPtr);
              const dateEntry = exif[0x9003] ?? exif[0x9004];
              if (dateEntry) {
                const p = dateEntry + 8;
                const valueOffset = u32(p - 4);
                const value = readAscii(view, valueOffset, 20).replace(/:/g, "-").replace(" ", "T");
                if (/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/.test(value)) capturedAt = value.replace(/-(\d{2})-(\d{2})$/, ":$1:$2");
              }
            }
            const gpsPtr = ifd0[0x8825] ? u32(ifd0[0x8825] + 8) : null;
            let latitude: number | null = null;
            let longitude: number | null = null;
            if (gpsPtr !== null) {
              const gps = readIfd(gpsPtr);
              const ref = (entry: number) => gps[entry] ? readAscii(view, u32(gps[entry] + 8), 2) : "";
              const rational = (entry: number) => {
                if (!gps[entry]) return null;
                const p = u32(gps[entry] + 8);
                return [u32(p) / (u32(p + 4) || 1), u32(p + 8) / (u32(p + 12) || 1), u32(p + 16) / (u32(p + 20) || 1)];
              };
              const lat = rational(2); const lon = rational(4);
              if (lat && lon) { latitude = lat[0] + lat[1] / 60 + lat[2] / 3600; longitude = lon[0] + lon[1] / 60 + lon[2] / 3600; if (ref(1) === "S") latitude *= -1; if (ref(3) === "W") longitude *= -1; }
            }
            return resolve({ capturedAt, latitude, longitude });
          }
          offset += 2 + length;
        }
      } catch { /* malformed EXIF is treated as absent */ }
      resolve({ capturedAt: null, latitude: null, longitude: null });
    };
    reader.onerror = () => resolve({ capturedAt: null, latitude: null, longitude: null });
    reader.readAsArrayBuffer(file.slice(0, Math.min(file.size, 2_000_000)));
  });
}

export async function readPhotoDraft(file: File, index: number): Promise<PhotoDraftPhoto> {
  const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });
  const meta = file.type === "image/jpeg" ? await parseExif(file) : { capturedAt: null, latitude: null, longitude: null };
  return { id: `${index}-${file.name}-${file.size}`, name: file.name, dataUrl, ...meta, parseError: file.type === "image/jpeg" ? null : "この形式では撮影日時・位置情報を読み取れません" };
}

export function toDateKey(value: string | null) { return value ? value.slice(0, 10) : null; }
export function toDraftTime(value: string | null) { if (!value) return ""; const [h, m] = value.slice(11, 16).split(":").map(Number); return `${String(Math.min(26, h + (h < 3 ? 24 : 0))).padStart(2, "0")}:${String(Math.round(m / 5) * 5 % 60).padStart(2, "0")}`; }
