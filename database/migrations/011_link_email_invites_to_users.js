async function up(query) {
    await query(`
        UPDATE convites_membros_igreja cmi
        INNER JOIN usuario u
        ON LOWER(cmi.email_usuario_requisitado) = LOWER(u.email_usuario)
        LEFT JOIN membros_igreja mi
        ON mi.id_igreja = cmi.id_igreja
        AND mi.id_usuario = u.id_usuario
        SET cmi.id_usuario_requisitado = u.id_usuario
        WHERE cmi.id_usuario_requisitado IS NULL
        AND cmi.email_usuario_requisitado IS NOT NULL
        AND cmi.data_confirmacao IS NULL
        AND mi.id IS NULL
    `);
}

module.exports = {
    up
};
