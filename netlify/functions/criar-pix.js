exports.handler = async (event) => {
  // Só aceita POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Método não permitido" }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { nome, email, telefone, valor, endereco } = body;

    // Validação básica
    if (!nome || !email || !valor) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Campos obrigatórios ausentes" })
      };
    }

    const CI = process.env.VEXOPAY_CI;
    const CS = process.env.VEXOPAY_CS;

    if (!CI || !CS) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Credenciais não configuradas" })
      };
    }

    // Criar cobrança PIX na VexoPay
    const response = await fetch("https://api.vexopay.com.br/v1/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ci": CI,
        "cs": CS
      },
      body: JSON.stringify({
        amount: Math.round(parseFloat(valor) * 100), // em centavos
        customer: {
          name: nome,
          email: email,
          phone: telefone ? telefone.replace(/\D/g, "") : undefined
        },
        description: "Capacete Norisk FF302 – VGDS ACESSÓRIOS P MOTOS",
        payment_method: "pix",
        metadata: {
          endereco: endereco || ""
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("VexoPay error:", data);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.message || "Erro ao criar cobrança" })
      };
    }

    // Retorna apenas o necessário para o frontend
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id:          data.id,
        qr_code:     data.pix?.qr_code     || data.qr_code     || null,
        qr_code_img: data.pix?.qr_code_img || data.qr_code_img || null,
        status:      data.status,
        expires_at:  data.expires_at       || null
      })
    };

  } catch (err) {
    console.error("Erro interno:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro interno do servidor" })
    };
  }
};
