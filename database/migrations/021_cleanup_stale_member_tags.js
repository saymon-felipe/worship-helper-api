// Remove tags "orfas": vinculos de tags_usuario cuja pessoa nao e mais membro da igreja, cuja conta nao existe
// mais ou cuja tag foi excluida. Elas voltariam a aparecer se a pessoa fosse reconvidada para a igreja.
async function up(query) {
    const result = await query(`
        DELETE tu
        FROM tags_usuario tu
        LEFT JOIN membros_igreja mi
            ON mi.id_igreja = tu.tags_usuario_id_igreja
            AND mi.id_usuario = tu.tags_usuario_id_usuario
        LEFT JOIN usuario u
            ON u.id_usuario = tu.tags_usuario_id_usuario
        LEFT JOIN tags_igreja ti
            ON ti.id_tag = tu.tags_usuario_id_tag_referencia
        WHERE mi.id IS NULL
        OR u.id_usuario IS NULL
        OR ti.id_tag IS NULL
    `);

    console.log(`Tags orfas removidas: ${result.affectedRows}`);
}

module.exports = {
    up
};
