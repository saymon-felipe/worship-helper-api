const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const multer = require('multer');

const bucket = process.env.S3_BUCKET || 'worship-helper-bucket';

const s3 = new S3Client({
    region: process.env.REGION,
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(null, false);
    }
}

let uploadConfig = {
    upload: multer({
        storage: multerS3({
            s3,
            bucket,
            acl: 'public-read',
            key(req, file, cb) {
                let fileName = new Date().toISOString() + file.originalname;
                cb(null, fileName.replace(":", "_").replace(":", "_"));
            }
        }),
        limits: {
            fileSize: 1024 * 1024 * 2
        },
        fileFilter: fileFilter
    }),
    deleteFromS3: async function (attachmentId) {
        return s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: attachmentId }));
    }
}

module.exports = uploadConfig;



