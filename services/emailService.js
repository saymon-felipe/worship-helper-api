const nodemailer = require("nodemailer");
const createInviteHtml = require("../templates/invite");
const createExistingUserInviteHtml = require("../templates/inviteExistingUser");

function getMailUser() {
    return process.env.USER_EMAIL || process.env.EMAIL_USER || process.env.MAIL_USER || process.env.SMTP_USER || "";
}

function getMailPass() {
    return process.env.USER_PASS || process.env.EMAIL_PASS || process.env.MAIL_PASS || process.env.SMTP_PASS || "";
}

function getTransportConfig() {
    const user = getMailUser().trim();
    const pass = getMailPass().trim();

    if (!user || !pass) {
        return null;
    }

    if (process.env.SMTP_HOST) {
        return {
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user,
                pass
            }
        };
    }

    return {
        service: process.env.SMTP_SERVICE || "gmail",
        auth: {
            user,
            pass: pass.replace(/\s+/g, "")
        }
    };
}

function getAppUrl() {
    return (process.env.URL_APP || "http://localhost:5173").split(",")[0].trim().replace(/\/$/, "");
}

function getApiUrl() {
    return (process.env.URL_API || "http://localhost:3000").replace(/\/$/, "");
}

async function sendChurchInvite({ to, churchName, inviterName, existingUser = false }) {
    console.log(`[EMAIL_SERVICE] Iniciando envio de convite para: ${to}`);
    const transportConfig = getTransportConfig();

    if (!transportConfig) {
        console.error("[EMAIL_SERVICE] Configuração de transporte SMTP vazia (USER/PASS ausente).");
        throw new Error("Configuração de e-mail não encontrada");
    }

    console.log(`[EMAIL_SERVICE] Configurações de SMTP encontradas. Provedor/Host: ${transportConfig.host || transportConfig.service}`);

    try {
        const transporter = nodemailer.createTransport(transportConfig);
        const inviteUrl = existingUser
            ? `${getAppUrl()}/login?invite=church`
            : `${getAppUrl()}/register?email=${encodeURIComponent(to)}&invite=church`;

        console.log(`[EMAIL_SERVICE] Link de convite gerado: ${inviteUrl}`);

        const info = await transporter.sendMail({
            from: `"Worship Helper" <${getMailUser().trim()}>`,
            to,
            subject: `Convite para participar da igreja ${churchName}`,
            html: existingUser
                ? createExistingUserInviteHtml({ churchName, inviterName, loginUrl: inviteUrl, apiUrl: getApiUrl() })
                : createInviteHtml({ churchName, inviterName, inviteUrl, apiUrl: getApiUrl() }),
            text: `${inviterName} convidou você para participar da igreja ${churchName} no Worship Helper. Crie sua conta: ${inviteUrl}`
        });

        console.log(`[EMAIL_SERVICE] E-mail enviado com sucesso! MessageID: ${info.messageId}`);
    } catch (error) {
        console.error(`[EMAIL_SERVICE] Falha crítica ao enviar e-mail via transporter:`, error);
        throw error;
    }
}

module.exports = {
    sendChurchInvite
};
