const nodemailer = require("nodemailer");
const functions = require("../functions/functions");
const createInviteHtml = require("../templates/invite");
const createExistingUserInviteHtml = require("../templates/inviteExistingUser");
const createPasswordResetHtml = require("../templates/passwordReset");

const MISSING_CONFIG_MESSAGE = "Configuração de e-mail não encontrada";

function truncate(value, max) {
    const text = String(value || "");
    return text.length > max ? text.slice(0, max) : text;
}

function describeError(error) {
    const message = error && error.message ? error.message : String(error || "Erro desconhecido");
    const code = error && error.code ? `${error.code}: ` : "";
    return truncate(`${code}${message}`, 500);
}

// Guarda so metadados do envio (template, titulo, destinatario, status). Nunca o HTML nem links/tokens do corpo.
// Falha ao registrar nao pode derrubar nem mascarar o resultado do envio, entao nunca lanca.
async function recordEmail({ template, titulo, destinatario, status, messageId = null, erro = null, idIgreja = null, idConvite = null }) {
    try {
        await functions.executeSQL(
            `
                INSERT INTO
                    emails_enviados
                    (template, titulo, destinatario, status, message_id, erro, id_igreja, id_convite)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                truncate(template, 60),
                truncate(titulo, 255),
                truncate(destinatario, 255),
                status,
                messageId ? truncate(messageId, 255) : null,
                erro ? truncate(erro, 500) : null,
                idIgreja,
                idConvite
            ]
        );
    } catch (dbError) {
        console.error("[EMAIL_SERVICE] Não foi possível registrar o e-mail em emails_enviados:", dbError.message);
    }
}

// Envia e registra o resultado. "enviado" = o servidor SMTP aceitou a mensagem (rejeicoes/bounces assincronos nao sao rastreados).
// Relanca o erro original para o chamador decidir o que fazer.
async function deliver(transporter, mail, { template, idIgreja = null, idConvite = null } = {}) {
    const base = {
        template,
        titulo: mail.subject,
        destinatario: String(mail.to || ""),
        idIgreja,
        idConvite
    };

    try {
        const info = await transporter.sendMail(mail);

        // sendMail nao lanca quando o destinatario e recusado entre varios; sem nenhum aceito, nao saiu.
        if (Array.isArray(info.accepted) && info.accepted.length === 0) {
            const rejectedError = new Error(`Destinatário recusado pelo servidor SMTP${info.response ? ` (${info.response})` : ""}`);
            rejectedError.code = "EREJECTED";
            throw rejectedError;
        }

        await recordEmail({ ...base, status: "enviado", messageId: info.messageId });
        return info;
    } catch (error) {
        await recordEmail({ ...base, status: "falha", erro: describeError(error) });
        throw error;
    }
}

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

async function sendChurchInvite({ to, churchName, inviterName, existingUser = false, roleName = null, churchId = null, inviteId = null }) {
    console.log(`[EMAIL_SERVICE] Iniciando envio de convite para: ${to}`);
    const transportConfig = getTransportConfig();
    const template = existingUser ? "convite_igreja_usuario_existente" : "convite_igreja_novo_usuario";
    const subject = `Convite para participar da igreja ${churchName}`;

    if (!transportConfig) {
        console.error("[EMAIL_SERVICE] Configuração de transporte SMTP vazia (USER/PASS ausente).");
        await recordEmail({ template, titulo: subject, destinatario: to, status: "falha", erro: MISSING_CONFIG_MESSAGE, idIgreja: churchId, idConvite: inviteId });
        throw new Error(MISSING_CONFIG_MESSAGE);
    }

    console.log(`[EMAIL_SERVICE] Configurações de SMTP encontradas. Provedor/Host: ${transportConfig.host || transportConfig.service}`);

    try {
        const transporter = nodemailer.createTransport(transportConfig);
        const inviteUrl = existingUser
            ? `${getAppUrl()}/login?invite=church`
            : `${getAppUrl()}/register?email=${encodeURIComponent(to)}&invite=church`;

        console.log(`[EMAIL_SERVICE] Link de convite gerado: ${inviteUrl}`);

        const info = await deliver(transporter, {
            from: `"Worship Helper" <${getMailUser().trim()}>`,
            to,
            subject,
            html: existingUser
                ? createExistingUserInviteHtml({ churchName, inviterName, loginUrl: inviteUrl, apiUrl: getApiUrl(), roleName })
                : createInviteHtml({ churchName, inviterName, inviteUrl, apiUrl: getApiUrl(), roleName }),
            text: `${inviterName} convidou você para participar da igreja ${churchName}${roleName ? ` como ${roleName}` : ""} no Worship Helper. Crie sua conta: ${inviteUrl}`
        }, { template, idIgreja: churchId, idConvite: inviteId });

        console.log(`[EMAIL_SERVICE] E-mail enviado com sucesso! MessageID: ${info.messageId}`);
    } catch (error) {
        console.error(`[EMAIL_SERVICE] Falha crítica ao enviar e-mail via transporter:`, error);
        throw error;
    }
}

async function sendPasswordReset({ to, userName, token }) {
    const transportConfig = getTransportConfig();
    const template = "redefinicao_senha";
    const subject = "Redefinição de senha - Worship Helper";

    if (!transportConfig) {
        await recordEmail({ template, titulo: subject, destinatario: to, status: "falha", erro: MISSING_CONFIG_MESSAGE });
        throw new Error(MISSING_CONFIG_MESSAGE);
    }

    const resetUrl = `${getAppUrl()}/reset-password?email=${encodeURIComponent(to)}&token=${encodeURIComponent(token)}`;
    const transporter = nodemailer.createTransport(transportConfig);

    await deliver(transporter, {
        from: `"Worship Helper" <${getMailUser().trim()}>`,
        to,
        subject,
        html: createPasswordResetHtml({ userName, resetUrl, apiUrl: getApiUrl() }),
        text: `Use este link para redefinir sua senha no Worship Helper. Ele expira em 15 minutos: ${resetUrl}`
    }, { template });
}

module.exports = {
    deliver,
    recordEmail,
    sendChurchInvite,
    sendPasswordReset
};
