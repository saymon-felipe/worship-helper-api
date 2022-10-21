const aws = require('aws-sdk');
const multerS3 = require('multer-s3');
const multer = require('multer');
const util = require('util');

aws.config.update({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    region: process.env.REGION 
});

const s3 = new aws.S3();

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
            bucket: 'worship-helper-bucket',
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
        return s3.deleteObject({ Bucket: "worship-helper-bucket", Key: attachmentId }).promise();
    }
}

module.exports = uploadConfig;



