/** Indonesian mobile numbers: normalize formatting without guessing missing country codes. */
export function whatsappUrl(phone?: string | null): string | null {
  if (!phone || !/^[+\d\s().-]+$/.test(phone)) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  if (!/^628\d{8,11}$/.test(digits)) return null;
  return `https://wa.me/${digits}`;
}