export function sanitizeUser<T extends Record<string, any>>(user: T) {
  const { password, ...rest } = user;
  const out: any = { ...rest };

  // findById carrega conta.createdByUser / updatedByUser, que também têm hash
  if (out.conta) {
    out.conta = { ...out.conta };
    for (const key of ['createdByUser', 'updatedByUser']) {
      if (out.conta[key]) {
        const { password: _pw, ...clean } = out.conta[key];
        out.conta[key] = clean;
      }
    }
  }
  return out;
}
