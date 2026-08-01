const { S3Client, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const multer = require('multer');
const { randomUUID } = require('crypto');

const bucket = process.env.S3_BUCKET || 'worship-helper-bucket';
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_CIPHER_PDF_SIZE = 5 * 1024 * 1024;
const MAX_LIVE_AUDIO_SIZE = 3 * 1024 * 1024;
const imageExtensions = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
};

const s3 = new S3Client({
    region: process.env.REGION,
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY
    }
});

function normalizePrefix(prefix) {
    const cleanPrefix = String(prefix || '')
        .split('/')
        .filter((segment) => /^[a-zA-Z0-9_-]+$/.test(segment))
        .join('/');

    if (!cleanPrefix) {
        throw new Error('Caminho de upload inválido');
    }

    return cleanPrefix;
}

function fileFilter(req, file, cb) {
    if (imageExtensions[file.mimetype]) {
        cb(null, true);
        return;
    }

    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
}

function pdfFileFilter(req, file, cb) {
    const isPdf = file.mimetype === 'application/pdf'
        || String(file.originalname || '').toLowerCase().endsWith('.pdf');

    if (isPdf) {
        cb(null, true);
        return;
    }

    const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
    error.message = 'Envie um arquivo PDF valido';
    cb(error);
}

function liveAudioFileFilter(req, file, cb) {
    if (String(file.mimetype || "").startsWith("audio/") || file.mimetype === "video/webm") {
        cb(null, true);
        return;
    }

    const error = new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname);
    error.message = "Envie um trecho de audio valido";
    cb(error);
}

function createImageUpload(pathResolver) {
    return multer({
        storage: multerS3({
            s3,
            bucket,
            acl: 'public-read',
            contentType: multerS3.AUTO_CONTENT_TYPE,
            key(req, file, cb) {
                try {
                    const prefix = normalizePrefix(pathResolver(req, file));
                    const extension = imageExtensions[file.mimetype];
                    cb(null, `${prefix}/${Date.now()}-${randomUUID()}${extension}`);
                } catch (error) {
                    cb(error);
                }
            }
        }),
        limits: {
            fileSize: MAX_IMAGE_SIZE,
            files: 10
        },
        fileFilter
    });
}

function createCipherPdfUpload() {
    return multer({
        storage: multer.memoryStorage(),
        limits: {
            fileSize: MAX_CIPHER_PDF_SIZE,
            files: 1
        },
        fileFilter: pdfFileFilter
    });
}

function createLiveAudioUpload() {
    return multer({
        storage: multer.memoryStorage(),
        limits: {
            fileSize: MAX_LIVE_AUDIO_SIZE,
            files: 1
        },
        fileFilter: liveAudioFileFilter
    });
}

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

function keyFromLocation(location) {
    try {
        return decodeURIComponent(new URL(location).pathname.replace(/^\//, ''));
    } catch (error) {
        return String(location || '').split('/').slice(3).join('/');
    }
}

async function deleteFiles(files) {
    const list = Array.isArray(files) ? files : (files ? [files] : []);
    await Promise.all(list.map((file) => {
        const key = file.key || keyFromLocation(file.location || file);
        return key ? s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })) : Promise.resolve();
    }));
}

module.exports = {
    MAX_IMAGE_SIZE,
    MAX_CIPHER_PDF_SIZE,
    MAX_LIVE_AUDIO_SIZE,
    createImageUpload,
    createCipherPdfUpload,
    createLiveAudioUpload,
    keyFromLocation,
    deleteFromS3: async (key) => s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })),
    deleteFiles,
    putCipher: async (key, content) => s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: content,
        ContentType: 'text/plain; charset=utf-8',
        ContentEncoding: 'gzip'
    })),
    getCipher: async (key) => {
        const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        return streamToBuffer(response.Body);
    }
};
