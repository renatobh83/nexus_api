



export const ProcessAiNode = {
  async execute(node: any, context: any) {

    const prompt =
      context.mensagem;
    const response = await fetch('https://openui.panelapps.site/api/chat/completions', {
      method: "POST",
      headers: {
        "Host": "openui.panelapps.site",
        Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "model": "models/gemini-2.5-flash",
        "messages": [{ "role": "user", "content": prompt }]
      })
    });
    console.log(response)
    const data = await response.json()
    const resposta = data.choices[0].message.content;
    console.log(resposta)

    return {
      ...context,
      output: {
        type: "mensagem",
        data: resposta
      }
    };
  }
};