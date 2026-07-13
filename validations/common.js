const Joi = require("joi");

const id = Joi.number().integer().positive().required();
const text = (max) => Joi.string().trim().max(max).required();

module.exports = {
    Joi,
    id,
    text
};

