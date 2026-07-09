function formatJoiError(error) {
    return error.details.map((detail) => detail.message).join("; ");
}

function validateBody(schema) {
    return (req, res, next) => {
        const { value, error } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            return res.status(400).send({
                message: "Payload invalido",
                error: formatJoiError(error)
            });
        }

        req.body = value;
        return next();
    };
}

function validateParams(schema) {
    return (req, res, next) => {
        const { value, error } = schema.validate(req.params, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            return res.status(400).send({
                message: "Parametros invalidos",
                error: formatJoiError(error)
            });
        }

        req.params = value;
        return next();
    };
}

module.exports = {
    validateBody,
    validateParams
};
