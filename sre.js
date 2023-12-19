const axios = require('axios');
const fs = require('fs');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');

// Configure global axios timeout
const axiosInstance = axios.create({
  timeout: 108000 // 108 seconds in milliseconds
});

async function fetchActiveData() {
  const response = await axiosInstance.post('https://inventory.alertustech.com/json.php', {
    auth: 'beef'
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return response.data;
}

function readInactiveData() {
  const data = fs.readFileSync('/home/opc/SRE/inactive.json', 'utf8');
  return JSON.parse(data);
}

async function checkTitle(fqdn) {
  const urls = [
    `https://${fqdn}:443/AlertusWeb/Login?local`,
    `https://${fqdn}:8443/AlertusWeb/Login?local`
  ];

  for (const url of urls) {
    try {
      const response = await axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      const title = $('title').text();
      if (title === 'Alertus Console Login') {
        console.log(`Match found at ${url}`);
      }
    } catch (error) {
      console.error(`Error fetching ${url}: ${error.message}`);
      sendEmail(url, error.message);
    }
  }
}

function sendEmail(url, error_message) {
    let transporter = nodemailer.createTransport({
        // SMTP transport configuration
        service: 'gmail',
        auth: {
            user: 'wyhycu@gmail.com',
            pass: 'whjnerxieamfaxxc'
        }
    });

    let mailOptions = {
        from: 'SRE Monitor <wyhycu@gmail.com>',
        to: 'jford@alertus.com',
        subject: 'SRE Warning!',
        text: `Error fetching ${url}: ${error_message}`
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
  try {
    const active = await fetchActiveData();
    const inactive = readInactiveData();

    const activeFqdns = active
      .map(item => item.fqdn)
      .filter(fqdn => fqdn && !inactive.includes(fqdn)); // Skip if fqdn is null

    for (const fqdn of activeFqdns) {
      await checkTitle(fqdn);
    }
  } catch (error) {
    console.error(`Error in main function: ${error.message}`);
  }
}

main();
