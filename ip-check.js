const https = require('https');
const dns = require('dns').promises;
const fs = require('fs').promises;

// Function to make a POST request and get inventory
function getInventory() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'inventory.alertustech.com',
            path: '/json.php',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve(JSON.parse(data));
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write('{"auth": "beef"}');
        req.end();
    });
}

// Function to load exceptions from inactive.json
async function loadExceptions() {
    try {
        const data = await fs.readFile('inactive.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading exceptions:', error);
        return [];
    }
}

// Function to check IP discrepancies
async function checkIPDiscrepancies() {
    try {
        const inventory = await getInventory();
        const exceptions = await loadExceptions();
        const relevantData = inventory.map(item => ({ fqdn: item.fqdn, public_ip: item.public_ip }));

        for (let item of relevantData) {
            // Check if fqdn is a valid string and not in exceptions
            if (typeof item.fqdn !== 'string' || item.fqdn.length === 0 || exceptions.includes(item.fqdn)) {
                continue;
            }

            const resolvedIP = await dns.resolve4(item.fqdn).catch(() => null);

            if (!resolvedIP || resolvedIP[0] !== item.public_ip) {
                console.log(`Mismatch for ${item.fqdn}: DNS IP is ${resolvedIP ? resolvedIP[0] : 'Not resolved'}, Public IP is ${item.public_ip}`);
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkIPDiscrepancies();

