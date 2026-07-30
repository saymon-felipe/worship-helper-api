const zlib = require("zlib");
const { randomUUID } = require("crypto");
const uploadConfig = require("../../config/upload.js");

module.exports = {
    up: async (query) => {
        const musics = await query(`
            SELECT id_musica, id_igreja, cifra_conteudo, cifra_encoding
            FROM musicas
            WHERE id_igreja IS NOT NULL
              AND cifra_s3_key IS NULL
              AND cifra_conteudo IS NOT NULL
              AND OCTET_LENGTH(cifra_conteudo) > 0
        `);

        for (const music of musics) {
            const version = `legacy-${Date.now().toString(36)}-${randomUUID()}`;
            const key = `igrejas/${music.id_igreja}/musicas/${music.id_musica}/cifras/${version}.txt.gz`;
            const rawContent = Buffer.isBuffer(music.cifra_conteudo)
                ? music.cifra_conteudo
                : Buffer.from(String(music.cifra_conteudo), "utf8");
            const cipherContent = music.cifra_encoding === "gzip"
                ? rawContent
                : zlib.gzipSync(rawContent);

            await uploadConfig.putCipher(key, cipherContent);
            try {
                await query(
                    `UPDATE musicas
                     SET cifra_s3_key = ?, cifra_versao = ?, cifra_conteudo = '', cifra_encoding = ''
                     WHERE id_musica = ?`,
                    [key, version, music.id_musica]
                );
            } catch (error) {
                await uploadConfig.deleteFromS3(key).catch(() => null);
                throw error;
            }
        }
    }
};
