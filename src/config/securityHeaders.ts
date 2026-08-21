export type ContentSecurityPolicy = {
  directives: Record<string, string[]>;
};

/**
 * Resolve a política CSP aplicada pelo Helmet de acordo com o ambiente.
 */
export function getContentSecurityPolicy(
  nodeEnv = process.env.NODE_ENV,
): ContentSecurityPolicy | false {
  if (nodeEnv !== "production") return false;

  return {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  };
}

/**
 * Em produção, a política permite recursos do próprio backend, imagens HTTPS
 * e estilos inline legados, mas não permite `eval` nem scripts inline.
 * Em desenvolvimento e testes, o Helmet mantém a CSP desabilitada para não
 * interferir no fluxo local de desenvolvimento.
 */
