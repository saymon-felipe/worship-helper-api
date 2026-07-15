/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const escapeHtml = (value = "") => {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

module.exports = function createInviteHtml({ churchName, inviterName, inviteUrl, apiUrl }) {
    const safeChurchName = escapeHtml(churchName);
    const safeInviterName = escapeHtml(inviterName);
    const safeInviteUrl = escapeHtml(inviteUrl);

    return `
        <div style="background-color:#0b0a1a;padding:40px 20px;font-family:'Outfit', 'Inter', Arial, sans-serif;color:#ffffff;text-align:center;">
            <div style="max-width:500px;margin:0 auto;background:linear-gradient(135deg, #181635 0%, #121029 100%);border:1px solid rgba(255, 255, 255, 0.08);border-radius:20px;padding:32px;box-shadow:0 15px 35px rgba(0,0,0,0.5);text-align:left;">
                <!-- Logo Header -->
                <div style="text-align:center;margin-bottom:28px;">
                    <img src="${apiUrl}/public/worship-helper-letter.png" alt="Worship Helper" style="height:36px;display:inline-block;" />
                    <div style="height:2px;background:linear-gradient(90deg, transparent, #38b6ff, transparent);width:100px;margin:12px auto 0;"></div>
                </div>

                <!-- Greeting -->
                <h2 style="font-size:20px;font-weight:700;margin-top:0;margin-bottom:16px;color:#ffffff;text-align:center;">
                    Você foi convidado!
                </h2>

                <!-- Message Body -->
                <p style="font-size:15px;line-height:1.6;color:#d1d5db;margin-bottom:20px;text-align:center;">
                    Olá! O líder <strong>${safeInviterName}</strong> convidou você para fazer parte da igreja <strong>${safeChurchName}</strong> no Worship Helper.
                </p>

                <!-- Instruction / Action -->
                <div style="background:rgba(255, 255, 255, 0.03);border:1px solid rgba(255, 255, 255, 0.05);border-radius:12px;padding:18px;margin-bottom:28px;text-align:center;">
                    <p style="font-size:14px;line-height:1.5;color:#9ca3af;margin:0 0 16px;">
                        Crie sua conta com este e-mail para ter acesso às escalas, repertórios, cifras transpostas, avisos e muito mais.
                    </p>
                    <a href="${safeInviteUrl}" style="display:inline-block;background:#38b6ff;color:#0b0a1a;text-decoration:none;padding:12px 28px;border-radius:30px;font-weight:700;font-size:15px;box-shadow:0 4px 15px rgba(56, 182, 255, 0.3);">
                        Criar minha conta
                    </a>
                </div>

                <!-- Info details -->
                <p style="font-size:12px;line-height:1.6;color:#6b7280;margin-top:0;margin-bottom:0;text-align:center;border-top:1px solid rgba(255, 255, 255, 0.06);padding-top:20px;">
                    Caso o botão acima não funcione, copie e cole o seguinte link no seu navegador:<br>
                    <a href="${safeInviteUrl}" style="color:#38b6ff;text-decoration:none;word-break:break-all;">${safeInviteUrl}</a>
                </p>
            </div>
            
            <!-- Footer credits -->
            <div style="margin-top:24px;text-align:center;">
                <p style="font-size:12px;color:#4b5563;margin:0;">
                    Worship Helper © 2026. Todos os direitos reservados.
                </p>
            </div>
        </div>
    `;
};
