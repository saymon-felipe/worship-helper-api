const crypto = require("crypto");
const webpush = require("web-push");
const functions = require("../functions/functions");
const PUSH_NOTIFICATION_MESSAGES = require("../constants/pushNotificationMessages");

let vapidConfigured = false;

function getVapidConfiguration() {
    return {
        subject: process.env.VAPID_SUBJECT,
        publicKey: process.env.VAPID_PUBLIC_KEY,
        privateKey: process.env.VAPID_PRIVATE_KEY
    };
}

function isVapidConfigured() {
    const { subject, publicKey, privateKey } = getVapidConfiguration();

    if (!subject || !publicKey || !privateKey) {
        return false;
    }

    if (!vapidConfigured) {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        vapidConfigured = true;
    }

    return true;
}

function subscriptionHash(endpoint) {
    return crypto.createHash("sha256").update(endpoint).digest("hex");
}

function validateSubscription(subscription) {
    if (!subscription || typeof subscription.endpoint !== "string" || !subscription.keys) {
        throw new Error("Assinatura de notificacao invalida");
    }

    if (!subscription.keys.p256dh || !subscription.keys.auth) {
        throw new Error("Chaves da assinatura de notificacao invalidas");
    }
}

function truncateMessage(message, limit = 120) {
    const normalized = String(message || "").replace(/\s+/g, " ").trim();
    return normalized.length > limit ? normalized.slice(0, limit - 3) + "..." : normalized;
}

async function getEventRecipients(eventId, actorId) {
    return functions.executeSQL(`
        SELECT DISTINCT id_usuario
        FROM (
            SELECT me.id_usuario
            FROM membros_eventos me
            WHERE me.id_evento = ?
            UNION
            SELECT e.id_criador AS id_usuario
            FROM eventos e
            WHERE e.id = ?
        ) AS recipients
        WHERE id_usuario <> ?
    `, [eventId, eventId, actorId]);
}

async function sendToUsers(userIds, notification) {
    if (!isVapidConfigured() || !Array.isArray(userIds) || userIds.length === 0) {
        return;
    }

    const ids = [...new Set(userIds.map((id) => Number(id)).filter(Number.isInteger))];
    if (ids.length === 0) {
        return;
    }

    const subscriptions = await functions.executeSQL(`
        SELECT id, subscription
        FROM push_subscriptions
        WHERE id_usuario IN (?)
    `, [ids]);

    const payload = JSON.stringify(notification);
    await Promise.all(subscriptions.map(async (row) => {
        try {
            await webpush.sendNotification(JSON.parse(row.subscription), payload, {
                TTL: 60,
                urgency: "high"
            });
        } catch (error) {
            if (error.statusCode === 404 || error.statusCode === 410) {
                await functions.executeSQL("DELETE FROM push_subscriptions WHERE id = ?", [row.id]);
                return;
            }

            console.error("[Push] Falha ao enviar notificacao:", error.message);
        }
    }));
}

const pushNotificationService = {
    getPublicKey() {
        const { publicKey } = getVapidConfiguration();
        if (!publicKey || !isVapidConfigured()) {
            throw new Error("Notificacoes push nao estao configuradas no servidor");
        }

        return publicKey;
    },
    async saveSubscription(userId, subscription) {
        validateSubscription(subscription);

        await functions.executeSQL(`
            INSERT INTO push_subscriptions (id_usuario, endpoint_hash, subscription)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                id_usuario = VALUES(id_usuario),
                subscription = VALUES(subscription),
                data_atualizacao = CURRENT_TIMESTAMP
        `, [userId, subscriptionHash(subscription.endpoint), JSON.stringify(subscription)]);
    },
    async removeSubscription(userId, endpoint) {
        if (!endpoint) {
            return;
        }

        await functions.executeSQL(`
            DELETE FROM push_subscriptions
            WHERE id_usuario = ? AND endpoint_hash = ?
        `, [userId, subscriptionHash(endpoint)]);
    },
    async notifyEventCreated({ eventId, churchId, actorId, eventName }) {
        const recipients = await getEventRecipients(eventId, actorId);
        await sendToUsers(recipients.map((recipient) => recipient.id_usuario), {
            title: PUSH_NOTIFICATION_MESSAGES.EVENT_CREATED.title,
            body: PUSH_NOTIFICATION_MESSAGES.EVENT_CREATED.body(eventName),
            url: "/home/event/" + eventId + "?church=" + churchId,
            tag: "event-" + eventId
        });
    },
    async notifyChurchWarning({ churchId, actorId, message }) {
        const recipients = await functions.executeSQL(`
            SELECT id_usuario
            FROM membros_igreja
            WHERE id_igreja = ? AND id_usuario <> ?
        `, [churchId, actorId]);

        await sendToUsers(recipients.map((recipient) => recipient.id_usuario), {
            title: PUSH_NOTIFICATION_MESSAGES.CHURCH_WARNING.title,
            body: PUSH_NOTIFICATION_MESSAGES.CHURCH_WARNING.body(truncateMessage(message)),
            url: "/home/church/" + churchId,
            tag: "church-warning-" + churchId
        });
    },
    async notifyEventComment({ eventId, actorId, message }) {
        const [event] = await functions.executeSQL("SELECT nome, id_igreja FROM eventos WHERE id = ?", [eventId]);
        if (!event) {
            return;
        }

        const recipients = await getEventRecipients(eventId, actorId);
        await sendToUsers(recipients.map((recipient) => recipient.id_usuario), {
            title: PUSH_NOTIFICATION_MESSAGES.EVENT_COMMENT.title(event.nome),
            body: PUSH_NOTIFICATION_MESSAGES.EVENT_COMMENT.body(truncateMessage(message)),
            url: "/home/event/" + eventId + "?church=" + event.id_igreja,
            tag: "event-comment-" + eventId
        });
    },
    async notifyEventMusicComment({ eventId, musicId, actorId, message }) {
        const [event] = await functions.executeSQL("SELECT id_igreja FROM eventos WHERE id = ?", [eventId]);
        const [music] = await functions.executeSQL("SELECT nome_musica FROM musicas WHERE id_musica = ?", [musicId]);
        if (!event || !music) {
            return;
        }

        const recipients = await getEventRecipients(eventId, actorId);
        await sendToUsers(recipients.map((recipient) => recipient.id_usuario), {
            title: PUSH_NOTIFICATION_MESSAGES.EVENT_MUSIC_COMMENT.title(music.nome_musica),
            body: PUSH_NOTIFICATION_MESSAGES.EVENT_MUSIC_COMMENT.body(truncateMessage(message)),
            url: "/home/musics/" + musicId + "?event=" + eventId + "&church=" + event.id_igreja,
            tag: "event-music-comment-" + eventId + "-" + musicId
        });
    },
    async notifyInviteAccepted({ churchId, memberId, inviterId }) {
        const [church] = await functions.executeSQL(`
            SELECT nome_igreja, usuario_administrador
            FROM igreja
            WHERE id_igreja = ?
        `, [churchId]);
        const [member] = await functions.executeSQL(`
            SELECT nome_usuario
            FROM usuario
            WHERE id_usuario = ?
        `, [memberId]);

        if (!church || !member) {
            return;
        }

        await sendToUsers([inviterId, church.usuario_administrador].filter((id) => Number(id) !== Number(memberId)), {
            title: PUSH_NOTIFICATION_MESSAGES.INVITE_ACCEPTED.title,
            body: PUSH_NOTIFICATION_MESSAGES.INVITE_ACCEPTED.body(member.nome_usuario, church.nome_igreja),
            url: "/home/church/" + churchId,
            tag: "invite-accepted-" + churchId + "-" + memberId
        });
    }
};

module.exports = pushNotificationService;
