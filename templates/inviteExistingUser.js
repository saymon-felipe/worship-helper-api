const escapeHtml = (value = "") => {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

module.exports = function createExistingUserInviteHtml({ churchName, inviterName, loginUrl, apiUrl }) {
    const safeChurchName = escapeHtml(churchName);
    const safeInviterName = escapeHtml(inviterName);
    const safeLoginUrl = escapeHtml(loginUrl);

    return `
        <div style="background-color:#0b0a1a;padding:40px 20px;font-family:'Outfit', 'Inter', Arial, sans-serif;color:#ffffff;text-align:center;">
            <div style="max-width:500px;margin:0 auto;background:linear-gradient(135deg, #181635 0%, #121029 100%);border:1px solid rgba(255, 255, 255, 0.08);border-radius:20px;padding:32px;box-shadow:0 15px 35px rgba(0,0,0,0.5);text-align:left;">
                <div style="text-align:center;margin-bottom:28px;">
                    <img src="${apiUrl}/public/worship-helper-letter.png" alt="Worship Helper" style="height:36px;display:inline-block;" />
                    <div style="height:2px;background:linear-gradient(90deg, transparent, #38b6ff, transparent);width:100px;margin:12px auto 0;"></div>
                </div>
                <h2 style="font-size:20px;font-weight:700;margin-top:0;margin-bottom:16px;color:#ffffff;text-align:center;">Voce recebeu um convite</h2>
                <p style="font-size:15px;line-height:1.6;color:#d1d5db;margin-bottom:20px;text-align:center;">Ola! <strong>${safeInviterName}</strong> convidou voce para fazer parte da igreja <strong>${safeChurchName}</strong> no Worship Helper.</p>
                <div style="background:rgba(255, 255, 255, 0.03);border:1px solid rgba(255, 255, 255, 0.05);border-radius:12px;padding:18px;margin-bottom:28px;text-align:center;">
                    <p style="font-size:14px;line-height:1.5;color:#9ca3af;margin:0 0 16px;">Entre na sua conta para visualizar e aceitar o convite.</p>
                    <a href="${safeLoginUrl}" style="display:inline-block;background:#38b6ff;color:#0b0a1a;text-decoration:none;padding:12px 28px;border-radius:30px;font-weight:700;font-size:15px;box-shadow:0 4px 15px rgba(56, 182, 255, 0.3);">Entrar no Worship Helper</a>
                </div>
                <p style="font-size:12px;line-height:1.6;color:#6b7280;margin:0;text-align:center;border-top:1px solid rgba(255, 255, 255, 0.06);padding-top:20px;">Caso o botao acima nao funcione, copie e cole o seguinte link no seu navegador:<br><a href="${safeLoginUrl}" style="color:#38b6ff;text-decoration:none;word-break:break-all;">${safeLoginUrl}</a></p>
            </div>
            <div style="margin-top:24px;text-align:center;"><p style="font-size:12px;color:#4b5563;margin:0;">Worship Helper (c) 2026. Todos os direitos reservados.</p></div>
        </div>
    `;
};
