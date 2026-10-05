const HEX = /^#[0-9a-f]{6}$/i;
// DS SC: ink do botão primário, usado como destaque quando a cor da clínica é clara.
const DS_INK = '#2e2e30';

export function isLightColor(color: string): boolean {
  if (!HEX.test(color)) return false;
  const [r, g, b] = [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16) / 255).map(value => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
}

// A cor da clínica entra no :root porque os tons derivados (gradientes, fundos suaves) são calculados lá.
// Cor clara (ex.: off-white) não serve de destaque: ela vira o fundo do painel, e botões e destaques usam o ink do DS SC.
export function applyBrand(color: string | undefined) {
  if (typeof document === 'undefined') return;
  const style = document.documentElement.style;
  style.removeProperty('--sc-surface');
  if (!color || !HEX.test(color)) { style.removeProperty('--sc-brand'); return; }
  if (isLightColor(color)) {
    style.setProperty('--sc-brand', DS_INK);
    style.setProperty('--sc-surface', color);
  } else {
    style.setProperty('--sc-brand', color);
  }
}

// Cor de destaque efetiva (para amostras na área do admin).
export const accentOf = (color: string) => isLightColor(color) ? DS_INK : color;
