/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

module.exports = function createUserFeedbackHtml({ name, phone, email, teamSize }) {
    return `
      <div style="background-color: #0b0c16; color: #f1f5f9; font-family: sans-serif; padding: 32px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #22d3ee; margin: 0; font-size: 22px;">Worship Helper</h2>
          <span style="font-size: 10px; color: #06b6d4; letter-spacing: 2px; text-transform: uppercase;">Excelência no Altar</span>
        </div>
        
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
            <li>Como transpor cifras automaticamente em 12 tons de semitono;</li>
            <li>Configuração de escalas de músicos sem conflitos de datas;</li>
            <li>Divisão e visualização de repertórios (Setlists) específicos para cultos;</li>
            <li>Modo altar com paletas de cores de alta visibilidade e modo noturno.</li>
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
