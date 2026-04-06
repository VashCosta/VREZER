const Busboy = require('busboy');
const pdf = require('pdf-parse');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    return new Promise((resolve, reject) => {
        const busboy = Busboy({ headers: event.headers });
        let fileBuffer = Buffer.alloc(0);
        let fileName = '';

        busboy.on('file', (name, file, info) => {
            const { filename } = info;
            fileName = filename;
            file.on('data', (data) => {
                fileBuffer = Buffer.concat([fileBuffer, data]);
            });
        });

        busboy.on('finish', async () => {
            try {
                if (!fileBuffer.length) {
                    return resolve({
                        statusCode: 400,
                        body: JSON.stringify({ error: true, message: 'No file uploaded' })
                    });
                }

                const data = await pdf(fileBuffer);
                resolve({
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: data.text })
                });
            } catch (err) {
                resolve({
                    statusCode: 500,
                    body: JSON.stringify({ error: true, message: 'Extraction failed: ' + err.message })
                });
            }
        });

        busboy.on('error', (err) => {
            resolve({
                statusCode: 500,
                body: JSON.stringify({ error: true, message: 'Busboy error: ' + err.message })
            });
        });

        // Netlify event.body can be base64 encoded
        const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body);
        busboy.end(body);
    });
};
