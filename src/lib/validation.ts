/**
 * Valida se uma senha cumpre todos os requisitos de segurança definidos pelo sistema.
 * Requisitos baseados no formulário de alteração de senha de perfil:
 * - Entre 6 e 10 caracteres.
 * - Ao menos 1 letra maiúscula.
 * - Ao menos 1 letra minúscula.
 * - Ao menos 1 número.
 * - Ao menos 1 caractere especial da lista: !@#$%&*
 * 
 * @param password A senha a ser validada
 * @returns Retorna uma string descritiva do erro se for inválida, ou null se for válida.
 */
export function validatePassword(password: string): string | null {
  if (password.length < 6) {
    return 'A senha deve ter no mínimo 6 caracteres.';
  }
  if (password.length > 10) {
    return 'A senha deve ter no máximo 10 caracteres.';
  }
  
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%&*]/.test(password);

  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
    return 'A senha deve conter ao menos uma letra maiúscula, uma minúscula, um número e um caractere especial (!@#$%&*).';
  }

  return null;
}
