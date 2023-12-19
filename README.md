# This folder monitors our Alertus Server boxes managed by us.

### Install node, then install modules
```
npm install nodemailer
npm install axios cheerio
```
### Then make a cronjab
example:
```
*/3 * * * * /usr/bin/node /home/opc/SRE/sre.js >> /home/opc/SRE/LOGS/sre_log_$(date +\%Y-\%m-\%d_\%H-\%M-\%S).log 2>&1
0 0 * * * /usr/bin/node /home/opc/SRE/sslscan.js >> /home/opc/SRE/LOGS/sslscan-logfile_$(date +\%Y-\%m-\%d_\%H-\%M-\%S).log 2>&1
```
viola.

Note: If you have problems reaching a site, use ip-check.js to see if some goofyball enabled CloudFlair and didn't tell us. 