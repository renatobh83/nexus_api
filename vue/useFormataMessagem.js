(function (global) {
  /** Escapa caracteres que poderiam ser interpretados como HTML pelo v-html. */
  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[character];
    });

  /** Identifica caracteres alfanuméricos para preservar a sintaxe de formatação do WhatsApp. */
  const isAlphanumeric = (character) => {
    if (!character) return false;
    const code = character.charCodeAt(0);
    return (
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      (code >= 48 && code <= 57)
    );
  };

  /** Converte URLs HTTP(S) em links sem inserir esquemas executáveis ou atributos não escapados. */
  const hyperlinkify = (text) => {
    const urlRegex =
      /(\bhttps?:\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;

    return text.replace(urlRegex, (url) => {
      const href = url.startsWith("http") ? url : `http://${url}`;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
  };

  /** Aplica uma marca de formatação somente depois que o texto foi escapado. */
  const whatsappStyles = (value, wildcard, openingTag, closingTag) => {
    const indices = [];
    const characters = [...value];

    for (let index = 0; index < characters.length; index += 1) {
      if (characters[index] !== wildcard) continue;

      if (indices.length % 2) {
        const previous = characters[index - 1];
        const next = characters[index + 1];
        if (previous === " ") continue;
        if (next === undefined || !isAlphanumeric(next)) indices.push(index);
      } else {
        const previous = characters[index - 1];
        const next = characters[index + 1];
        if (next === undefined || next === " ") continue;
        if (previous === undefined || !isAlphanumeric(previous)) indices.push(index);
      }
    }

    if (indices.length % 2) indices.pop();

    let result = value;
    let offset = 0;
    indices.forEach((position, index) => {
      const tag = index % 2 ? closingTag : openingTag;
      result =
        result.slice(0, position + offset) +
        tag +
        result.slice(position + offset + 1);
      offset += tag.length - 1;
    });

    return result;
  };

  /** Formata texto WhatsApp com HTML seguro para os pontos legados que usam v-html. */
  const formatarMensagem = (body) => {
    if (body === null || body === undefined || body === "") return "";

    let format = escapeHtml(body);
    format = whatsappStyles(format, "_", "<i>", "</i>");
    format = whatsappStyles(format, "*", "<b>", "</b>");
    format = whatsappStyles(format, "~", "<s>", "</s>");
    format = format.replace(/\n/gi, "<br>");
    return hyperlinkify(format);
  };

  global.formatarMensagem = formatarMensagem;
})(window);
