/** Normalizes and validates an Indian mobile number to +91XXXXXXXXXX. Mirrors src/lib/user-auth.ts's validateMobile on the frontend. */
export function normalizeIndianMobile(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) return "+91" + digits;
  if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits.slice(1)))
    return "+91" + digits.slice(1);
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2)))
    return "+" + digits;
  return null;
}
