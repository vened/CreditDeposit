import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const font = readFile(join(process.cwd(), 'public/fonts/NotoSans-Regular.ttf'));
export async function createShareImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#f7f6ef', color: '#173d32', padding: '64px 72px', fontFamily: 'Noto Sans' }}>
      <div style={{ display: 'flex', fontSize: 36 }}>% процент</div>
      <div style={{ display: 'flex', flexDirection: 'column', fontSize: 68, lineHeight: 1.15, letterSpacing: -2 }}><div>Сначала посчитайте.</div><div>Потом решайте.</div></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #d6dbcf', paddingTop: 26, fontSize: 24 }}><div>Вклад · Счёт · Кредит · Карта</div><div>На ваших условиях.</div></div>
    </div>,
    { width: 1200, height: 630, fonts: [{ name: 'Noto Sans', data: await font, style: 'normal', weight: 400 }] },
  );
}
