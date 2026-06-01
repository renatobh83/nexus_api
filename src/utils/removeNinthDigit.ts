export function removeNinthDigit(phone: string): string {
  // Remove qualquer caractere não numérico primeiro
  const digits = phone.replace(/\D/g, "");

  // Se tiver 11 dígitos (DDD + 9 + 8 dígitos), remove o 3º dígito
  if (digits.length === 11) {
    return digits.slice(0, 2) + digits.slice(3);
  }

  // Se já tiver 10 dígitos, retorna como está
  return digits;
}
