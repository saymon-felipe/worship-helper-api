const zlib = require("zlib");
const { randomUUID } = require("crypto");
const uploadConfig = require("../../config/upload.js");

function cipherVersion() {
    return `legacy-${Date.now().toString(36)}-${randomUUID()}`;
}

module.exports = {
    up: async (query) => {
        const musics = await query(`
            SELECT id_musica, cifra_s3_key, cifra_versao, cifra_conteudo, cifra_encoding
            FROM musicas
            WHERE id_igreja IS NULL
              AND (
                cifra_s3_key LIKE 'igrejas/null/%'
                OR (cifra_s3_key IS NULL AND cifra_conteudo IS NOT NULL AND OCTET_LENGTH(cifra_conteudo) > 0)
              )
        `);

        for (const music of musics) {
            const version = music.cifra_versao || cipherVersion();
            const newKey = `legado/musicas-sem-igreja/${music.id_musica}/cifras/${version}.txt.gz`;
            const existingKey = music.cifra_s3_key;
            const rawContent = existingKey
                ? await uploadConfig.getCipher(existingKey)
                : (Buffer.isBuffer(music.cifra_conteudo)
                    ? music.cifra_conteudo
                    : Buffer.from(String(music.cifra_conteudo), "utf8"));
            const cipherContent = existingKey || music.cifra_encoding === "gzip"
                ? rawContent
                : zlib.gzipSync(rawContent);

            await uploadConfig.putCipher(newKey, cipherContent);
            try {
                await query(
                    `UPDATE musicas
                     SET cifra_s3_key = ?, cifra_versao = ?, cifra_conteudo = '', cifra_encoding = ''
                     WHERE id_musica = ? AND id_igreja IS NULL`,
                    [newKey, version, music.id_musica]
                );
            } catch (error) {
                await uploadConfig.deleteFromS3(newKey).catch(() => null);
                throw error;
            }

            if (existingKey && existingKey !== newKey) {
                await uploadConfig.deleteFromS3(existingKey);
            }
        }
    }
};
