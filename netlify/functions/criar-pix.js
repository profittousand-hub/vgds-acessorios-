exports.handler = async (event) => {
  const CI = process.env.VEXOPAY_CI;
  const CS = process.env.VEXOPAY_CS;

  // GET - consultar status
  if (event.httpMethod === 'GET') {
    const id = event.queryStringParameters?.transactionId || event.queryStringParameters?.id;
    if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'ID ausente' }) };
    try {
      const res = await fetch(`https://www.vexopay.com.br/api/gateway/pix-status?transactionId=${id}`, {
        headers: { 'ci': CI, 'cs': CS, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: data?.data?.status || 'pending' })
      };
    } catch(e) {
      return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
  }

  // POST - criar cobrança PIX
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { nome, email, cpf, valor } = body;

    if (!nome || !cpf) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Nome e CPF são obrigatórios' }) };
    }
    if (!CI || !CS) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Credenciais não configuradas' }) };
    }

    const res = await fetch('https://www.vexopay.com.br/api/gateway/pix-create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ci': CI,
        'cs': CS
      },
      body: JSON.stringify({
        amount: parseFloat(valor || '76.93'),
        payerName: nome,
        payerDocument: cpf.replace(/\D/g, ''),
        description: 'Capacete Norisk FF302 – VGDS ACESSÓRIOS P MOTOS'
      })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      console.error('VexoPay error:', JSON.stringify(data));
      return {
        statusCode: res.status || 400,
        body: JSON.stringify({ error: data?.message || data?.error || 'Erro ao criar cobrança' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id:          data.data.transactionId,
        qr_code:     data.data.copyPaste,
        qr_code_img: data.data.qrCodeBase64 || data.data.qrCodeUrl,
        status:      data.data.status,
        expires_at:  data.data.expiresAt
      })
    };

  } catch(err) {
    console.error('Erro interno:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erro interno: ' + err.message }) };
  }
};
