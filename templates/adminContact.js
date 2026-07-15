/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

module.exports = function createAdminContactHtml({ name, phone, email, teamSize }) {
    return `
      <div style="background-color: #0b0c16; color: #f1f5f9; font-family: sans-serif; padding: 32px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <h2 style="color: #22d3ee; border-bottom: 2px solid #1e293b; padding-bottom: 12px; font-size: 20px; margin-top: 0;">
          Novo Lead de Demonstração Recebido!
        </h2>
        <p style="font-size: 14px; color: #94a3b8; line-height: 1.5;">
          Um líder de ministério solicitou agendamento de horário para demonstração do Worship Helper.
        </p>
        <div style="background-color: #07080e; padding: 20px; border-radius: 12px; border: 1px solid #1e293b; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #94a3b8; font-weight: bold; width: 40%;">Nome do Líder:</td>
              <td style="padding: 6px 0; color: #ffffff;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8; font-weight: bold;">WhatsApp:</td>
              <td style="padding: 6px 0; color: #22d3ee; font-weight: bold;">${phone}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8; font-weight: bold;">E-mail:</td>
              <td style="padding: 6px 0; color: #ffffff;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8; font-weight: bold;">Equipe de Louvor:</td>
              <td style="padding: 6px 0; color: #ffffff;">${teamSize || 'Não informado'}</td>
            </tr>
          </table>
        </div>
        <p style="font-size: 11px; color: #64748b; text-align: center; margin-top: 30px; margin-bottom: 0;">
          Enviado automaticamente pelo sistema Worship Helper.
        </p>
      </div>
    `;
};
