import fs from 'fs';

const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const rewrites = vercelConfig.rewrites || [];

let nginxConfig = `server {
    listen 80;
    server_name totalsolutions.clearskysoftware.net;
    root /var/www/totalsolutions.clearskysoftware.net;
    index index.html rightflush-home__3_.html;

`;

for (const rw of rewrites) {
    let dest = rw.destination;
    if (!dest.startsWith('/')) dest = '/' + dest;
    
    if (rw.source === '/') {
        nginxConfig += `    location = / {\n        rewrite ^ ${dest} last;\n    }\n`;
    } else {
        const src = rw.source.replace(/\/$/, '') || '/';
        nginxConfig += `    location = ${src} {\n        rewrite ^ ${dest} last;\n    }\n`;
        nginxConfig += `    location = ${src}/ {\n        rewrite ^ ${dest} last;\n    }\n`;
    }
}

nginxConfig += `
    location / {
        try_files $uri $uri/ =404;
    }
}
`;

fs.writeFileSync('/etc/nginx/sites-available/totalsolutions.clearskysoftware.net', nginxConfig);
console.log('Nginx config generated!');
