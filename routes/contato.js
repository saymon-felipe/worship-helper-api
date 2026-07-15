/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const createAdminContactHtml = require('../templates/adminContact');
const createUserFeedbackHtml = require('../templates/userFeedback');
const functions = require('../functions/functions');

router.post('/solicitar-demonstracao', async (req, res, next) => {
    const { name, phone, email, teamSize } = req.body;
    
    if (!name || !phone || !email) {
        return res.status(400).send({ error: 'Campos obrigatórios ausentes.' });
    }

    // Save lead to database
    try {
        await functions.executeSQL(
            `INSERT INTO leads 
                (nome, email, telefone, origem, tipo_equipe, nome_igreja) 
             VALUES 
                (?, ?, ?, 'site_contato', ?, NULL)`,
            [name, email, phone, teamSize]
        );
        console.log(`[LEADS] Contact lead saved to database for: ${email}`);
    } catch (err) {
        console.error('[LEADS ERROR] Failed to save contact lead to database:', err);
    }

    const adminEmail = process.env.APP_ADMINISTRATOR_EMAIL;

    // Generates templates from templates folder
    const adminHtml = createAdminContactHtml({ name, phone, email, teamSize });
    const userHtml = createUserFeedbackHtml({ name, phone, email, teamSize });

    // Get email settings from env
    const smtpHost = 'smtp.gmail.com';
    const smtpPort = 587;
    const smtpUser = process.env.USER_EMAIL;
    const smtpPass = process.env.USER_PASS;

    if (smtpUser && smtpPass) {
        try {
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: false,
                auth: {
                    user: smtpUser,
                    pass: smtpPass
                }
            });

            // Send to Admin
            await transporter.sendMail({
                from: `"Worship Helper Leads" <${smtpUser}>`,
                to: adminEmail,
                subject: `Novo Lead de Demo: ${name} (${teamSize})`,
                html: adminHtml
            });

            // Send to User
            await transporter.sendMail({
                from: `"Worship Helper" <${smtpUser}>`,
                to: email,
                subject: 'Recebemos seu pedido de demonstração!',
                html: userHtml
            });

            console.log(`[SMTP API] Emails sent successfully for ${email}`);
            return res.status(200).send({ success: true, method: 'smtp' });
        } catch (err) {
            console.error('[SMTP API Error] Failed to send email via SMTP:', err);
            return res.status(500).send({ error: 'Erro ao enviar e-mail via servidor SMTP.', details: err.message });
        }
    }

    // Fallback mode
    console.log('\n=================== API MOCK EMAIL NOTIFICATION ===================');
    console.log(`TO ADMIN (${adminEmail}):`);
    console.log(`Subject: Novo Lead de Demo: ${name} (${teamSize})`);
    console.log('---------------------------------------------------------------------');
    console.log(`TO USER (${email}):`);
    console.log(`Subject: Recebemos seu pedido de demonstração!`);
    console.log('=====================================================================\n');

    return res.status(200).send({ 
        success: true, 
        method: 'mock',
        message: 'Credenciais de e-mail ausentes no .env do backend.'
    });
});

module.exports = router;
