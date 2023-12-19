/* 
    This checks if Let's Encrypt will expire in 30 days or not over both 443 & 8443
*/

const axios = require('axios');
const https = require('https');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;

// Load inactive
async function loadExceptions() {
    try {
        const data = await fs.readFile('/home/opc/SRE/inactive.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading inactive.json:', error);
        return [];
    }
}

// Load inventory
async function postRequestAndGetFqdns() {
    try {
        const response = await axios.post('https://inventory.alertustech.com/json.php', {
            auth: "beef"
        });

        const fqdns = response.data.map(item => item.fqdn).filter(fqdn => fqdn != null);
        return fqdns;
    } catch (error) {
        console.error('Error in POST request:', error);
        return [];
    }
}

// Check that jawns
async function checkSSLExpiryAndNotify(fqdn, exceptions) {
    if (exceptions.includes(fqdn)) {
        console.log(`Skipping SSL check for ${fqdn} (in exceptions list).`);
        return;
    }

    const urls = [
        `https://${fqdn}/AlertusWeb/Login?local`,
        `https://${fqdn}:8443/AlertusWeb/Login?local`
    ];

    for (let url of urls) {
        await new Promise((resolve, reject) => {
            https.get(url, (res) => {
                const cert = res.socket.getPeerCertificate();
                if (cert.valid_to) {
                    const expiryDate = new Date(cert.valid_to);
                    const currentDate = new Date();
                    const daysUntilExpiry = Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24));

                    if (daysUntilExpiry <= 30) {
                        console.log(`${url} SSL certificate will expire in less than 30 days.`);
                        sendEmail(url, daysUntilExpiry);
                    } else {
                        console.log(`${url} SSL certificate is valid for more than 30 days.`);
                    }
                }
                resolve();
            }).on('error', (e) => {
                console.error(`Error checking ${url}:`, e);
                reject();
            });
        });
    }
}

// Send that jawns
function sendEmail(url, daysUntilExpiry) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'wyhycu@gmail.com',
            pass: 'whjnerxieamfaxxc'
        }
    });

    let mailOptions = {
        from: 'SSL Monitor <wyhycu@gmail.com>',
        to: 'jford@alertus.com',
        subject: 'SSL Certificate Expiry Warning',
        text: `Warning: The SSL certificate for ${url} is expiring in ${daysUntilExpiry} days.`
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log('Error sending email:', error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

async function main() {
    const exceptions = await loadExceptions();
    const fqdns = await postRequestAndGetFqdns();
    for (let fqdn of fqdns) {
        await checkSSLExpiryAndNotify(fqdn, exceptions);
    }
}

main();