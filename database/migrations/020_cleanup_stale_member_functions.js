// Remove cargos "orfaos": vinculos de funcoes_usuario cuja pessoa nao e mais membro da igreja, cuja conta
// nao existe mais ou cuja funcao foi excluida. Eles nao concedem nada hoje (checkPermission exige ser membro),
// mas voltariam a valer se a pessoa fosse reconvidada para a igreja.
async function up(query) {
    const result = await query(`
        DELETE fu
        FROM funcoes_usuario fu
        LEFT JOIN membros_igreja mi
            ON mi.id_igreja = fu.id_funcoes_igreja_id_igreja
            AND mi.id_usuario = fu.id_funcoes_igreja_id_usuario
        LEFT JOIN usuario u
            ON u.id_usuario = fu.id_funcoes_igreja_id_usuario
        LEFT JOIN funcoes_igreja fi
            ON fi.id_funcoes_igreja = fu.id_funcoes_referencia
        WHERE mi.id IS NULL
        OR u.id_usuario IS NULL
        OR fi.id_funcoes_igreja IS NULL
    `);

    console.log(`Cargos orfaos removidos: ${result.affectedRows}`);
}

module.exports = {
    up
};
