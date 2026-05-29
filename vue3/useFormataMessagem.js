(function (global) { 

const formatarMensagem = (body) => {
 if (!body) return;
  let format = body;

  function is_aplhanumeric(c) {
    const x = c.charCodeAt();
    return !!(
      (x >= 65 && x <= 90) ||
      (x >= 97 && x <= 122) ||
      (x >= 48 && x <= 57)
    );
  }
  function hyperlinkify(text) {
    const urlRegex =
      /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;
    return text.replace(urlRegex, (url) => {
      const href = url.startsWith("http") ? url : `http://${url}`;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
  }
  function whatsappStyles(
    format,
    wildcard,
    opTag,
    clTag
  ) {
    const indices = [];

    const chars = [...format]; // Transforma string em array de caracteres
    for (let i = 0; i < chars.length; i++) {
      if (chars[i] === wildcard) {
        // Lógica para determinar os índices
        if (indices.length % 2) {
          // indices.push(i);
          format[i - 1] == " "
            ? null
            : typeof format[i + 1] == "undefined"
              ? indices.push(i)
              : is_aplhanumeric(format[i + 1] )
                ? null
                : indices.push(i);
        } else {
          typeof format[i + 1] == "undefined"
            ? null
            : format[i + 1] == " "
              ? null
              : typeof format[i - 1] == "undefined"
                ? indices.push(i)
                : is_aplhanumeric(format[i - 1] )
                  ? null
                  : indices.push(i);
        }
      }
    }
    indices.length % 2 && indices.pop(); // Remove último índice se for ímpar

    let e = 0;
    indices.forEach((v, i) => {
      const t = i % 2 ? clTag : opTag;
      format = format.slice(0, v + e) + t + format.slice(v + e + 1);
      e += t.length - 1;
    });
    return format;
  }
  format = whatsappStyles(format, "_", "<i>", "</i>");
  format = whatsappStyles(format, "*", "<b>", "</b>");
  format = whatsappStyles(format, "~", "<s>", "</s>");
  format = format.replace(/\n/gi, "<br>");
  format = hyperlinkify(format);

  return format;
};
global.formatarMensagem = formatarMensagem
})(window);