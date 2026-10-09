const http = require('http');
const https = require('https');

function streamRemoteDocument(url, res, {
  filename = 'document',
  contentType = 'application/octet-stream',
  disposition = 'inline',
} = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const request = client.get(url, (upstream) => {
      if (upstream.statusCode && upstream.statusCode >= 400) {
        upstream.resume();
        reject({
          status: 404,
          message: 'Could not load this document from storage. Please re-upload it or contact support.',
        });
        return;
      }

      res.setHeader('Content-Type', upstream.headers['content-type'] || contentType);
      res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
      res.setHeader('Cache-Control', 'private, no-store');
      upstream.pipe(res);
      upstream.on('end', resolve);
      upstream.on('error', reject);
    });

    request.on('error', () => {
      reject({ status: 404, message: 'Document file not found' });
    });
  });
}

module.exports = { streamRemoteDocument };
