// A cor da clínica entra no :root porque os tons derivados (gradientes, fundos suaves) são calculados lá.
export function applyBrand(color: string | undefined) {
  if (typeof document === 'undefined') return;
  if (color && /^#[0-9a-f]{6}$/i.test(color)) document.documentElement.style.setProperty('--sc-brand', color);
  else document.documentElement.style.removeProperty('--sc-brand');
}
