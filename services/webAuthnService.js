const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse
} = require("@simplewebauthn/server");
const functions = require("../functions/functions");

function getConfig() {
    const appUrl = (process.env.WEBAUTHN_ORIGIN || process.env.URL_APP || "http://localhost:5173")
        .split(",")[0]
        .trim()
        .replace(/\/$/, "");
    const url = new URL(appUrl);

    return {
        rpName: process.env.WEBAUTHN_RP_NAME || "Worship Helper",
        rpID: process.env.WEBAUTHN_RP_ID || url.hostname,
        origin: appUrl
    };
}

async function getUserById(userId) {
    const users = await functions.executeSQL(
        "SELECT id_usuario, nome_usuario, email_usuario FROM usuario WHERE id_usuario = ? LIMIT 1",
        [userId]
    );
    if (users.length <= 0) throw new Error("Usuário não encontrado");
    return users[0];
}

async function getUserByEmail(email) {
    const users = await functions.executeSQL(
        "SELECT id_usuario, nome_usuario, email_usuario FROM usuario WHERE LOWER(email_usuario) = ? LIMIT 1",
        [String(email || "").trim().toLowerCase()]
    );
    return users[0] || null;
}

async function getCredentials(userId) {
    const credentials = await functions.executeSQL(
        "SELECT * FROM webauthn_credentials WHERE id_usuario = ?",
        [userId]
    );
    return credentials.map((credential) => ({
        ...credential,
        transports: credential.transports ? JSON.parse(credential.transports) : []
    }));
}

async function saveChallenge(userId, type, challenge) {
    await functions.executeSQL("DELETE FROM webauthn_challenges WHERE id_usuario = ? AND tipo = ?", [userId, type]);
    await functions.executeSQL(`
        INSERT INTO webauthn_challenges (id_usuario, tipo, challenge, expires_at)
        VALUES (?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 5 MINUTE))
    `, [userId, type, challenge]);
}

async function getChallenge(userId, type) {
    const challenges = await functions.executeSQL(`
        SELECT id, challenge
        FROM webauthn_challenges
        WHERE id_usuario = ? AND tipo = ? AND expires_at > CURRENT_TIMESTAMP()
        LIMIT 1
    `, [userId, type]);
    return challenges[0] || null;
}

async function clearChallenge(id) {
    await functions.executeSQL("DELETE FROM webauthn_challenges WHERE id = ?", [id]);
}

async function registrationOptions(userId) {
    const [user, credentials] = await Promise.all([getUserById(userId), getCredentials(userId)]);
    const config = getConfig();
    const options = await generateRegistrationOptions({
        rpName: config.rpName,
        rpID: config.rpID,
        userID: new Uint8Array(Buffer.from(String(user.id_usuario))),
        userName: user.email_usuario,
        userDisplayName: user.nome_usuario,
        attestationType: "none",
        excludeCredentials: credentials.map((credential) => ({ id: credential.credential_id, transports: credential.transports })),
        authenticatorSelection: {
            residentKey: "required",
            userVerification: "required",
            authenticatorAttachment: "platform"
        },
        supportedAlgorithmIDs: [-7, -257]
    });

    await saveChallenge(user.id_usuario, "registration", options.challenge);
    return options;
}

async function verifyRegistration(userId, response) {
    const [challenge, config] = await Promise.all([getChallenge(userId, "registration"), Promise.resolve(getConfig())]);
    if (!challenge) throw new Error("A solicitação biométrica expirou. Tente novamente.");

    const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: config.origin,
        expectedRPID: config.rpID,
        requireUserVerification: true,
        supportedAlgorithmIDs: [-7, -257]
    });

    if (!verification.verified || !verification.registrationInfo) {
        throw new Error("Não foi possível validar a biometria deste dispositivo.");
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    await functions.executeSQL(`
        INSERT INTO webauthn_credentials
            (id_usuario, credential_id, public_key, counter, transports, device_type, backed_up)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
        userId,
        credential.id,
        Buffer.from(credential.publicKey),
        credential.counter,
        JSON.stringify(credential.transports || []),
        credentialDeviceType,
        credentialBackedUp ? 1 : 0
    ]);
    await clearChallenge(challenge.id);
}

async function authenticationOptions(email) {
    const user = await getUserByEmail(email);
    if (!user) throw new Error("Biometria não está disponível para este e-mail.");

    const credentials = await getCredentials(user.id_usuario);
    if (credentials.length <= 0) throw new Error("Nenhuma biometria foi cadastrada para este e-mail.");

    const options = await generateAuthenticationOptions({
        rpID: getConfig().rpID,
        allowCredentials: credentials.map((credential) => ({ id: credential.credential_id, transports: credential.transports })),
        userVerification: "required"
    });
    await saveChallenge(user.id_usuario, "authentication", options.challenge);
    return options;
}

async function verifyAuthentication(email, response) {
    const user = await getUserByEmail(email);
    if (!user) throw new Error("Não foi possível validar a biometria.");

    const [challenge, credentials] = await Promise.all([getChallenge(user.id_usuario, "authentication"), getCredentials(user.id_usuario)]);
    if (!challenge) throw new Error("A solicitação biométrica expirou. Tente novamente.");

    const credential = credentials.find((item) => item.credential_id === response.id);
    if (!credential) throw new Error("Credencial biométrica não encontrada.");

    const config = getConfig();
    const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: config.origin,
        expectedRPID: config.rpID,
        credential: {
            id: credential.credential_id,
            publicKey: new Uint8Array(credential.public_key),
            counter: Number(credential.counter),
            transports: credential.transports
        },
        requireUserVerification: true
    });

    if (!verification.verified) throw new Error("Não foi possível validar a biometria.");

    await functions.executeSQL(
        "UPDATE webauthn_credentials SET counter = ?, ultimo_uso = CURRENT_TIMESTAMP() WHERE id = ?",
        [verification.authenticationInfo.newCounter, credential.id]
    );
    await clearChallenge(challenge.id);
    return user.id_usuario;
}

module.exports = {
    registrationOptions,
    verifyRegistration,
    authenticationOptions,
    verifyAuthentication
};
