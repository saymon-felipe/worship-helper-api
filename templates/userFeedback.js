/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

module.exports = function createUserFeedbackHtml({ name, phone, email, teamSize }) {
    const apiUrl = (process.env.URL_API || 'http://localhost:3000').replace(/\/$/, '');
    const logoUrl = `${apiUrl}/public/worship-helper-icon.png`;

    return `
      <div style="background-color: #0b0c16; color: #f1f5f9; font-family: sans-serif; padding: 32px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 24px auto;">
          <tr>
            <td style="vertical-align: middle; padding-right: 12px;">
              <img src="${logoUrl}" alt="Worship Helper" style="width: 44px; height: 44px; display: block; border-radius: 12px;" />
            </td>
            <td style="vertical-align: middle; text-align: left;">
              <h2 style="color: #22d3ee; margin: 0; font-size: 22px; line-height: 1.1;">Worship Helper</h2>
            </td>
          </tr>
        </table>
        
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
          Olá <strong>${name}</strong>,
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
          Agradecemos o seu interesse no <strong>Worship Helper</strong>! Recebemos sua solicitação de demonstração.
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
          Nas próximas horas, um de nossos consultores ministeriais entrará em contato com você pelo seu WhatsApp (<strong>${phone}</strong>) para agendarmos o melhor horário para nossa conversa.
        </p>
        
        <div style="background-color: #07080e; padding: 20px; border-radius: 12px; border: 1px solid #1e293b; margin: 24px 0;">
          <h4 style="margin: 0 0 8px 0; color: #ffffff; font-size: 13px;">O que vamos ver na demonstração?</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #94a3b8; line-height: 1.6;">
            <li>Como o app funciona no fluxo real da igreja;</li>
            <li>Como criar eventos e organizar a programação;</li>
            <li>Como cadastrar pessoas e delegar funções para a equipe;</li>
            <li>Como configurar permissões de acesso por função;</li>
            <li>Como adicionar músicas ao repertório e usar tudo no dia a dia.</li>
          </ul>
        </div>

        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
          Se você tiver alguma dúvida adicional nesse intervalo, sinta-se à vontade para nos responder por este e-mail.
        </p>
        
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-top: 24px;">
          Fraternalmente,<br/>
          <strong style="color: #22d3ee;">Equipe Worship Helper</strong>
        </p>
        
        <div style="border-top: 1px solid #1e293b; padding-top: 16px; margin-top: 32px; text-align: center; font-size: 11px; color: #64748b;">
          <p style="margin: 0;">© 2026 Worship Helper Inc. Todos os direitos reservados.</p>
        </div>
      </div>
    `;
};
