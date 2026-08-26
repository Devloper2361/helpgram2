const fs = require('fs');
let code = fs.readFileSync('check_security.ts', 'utf8');

const replacement = `
    const createResClean = await makeRequest('POST', '/tasks', tokenReq1, {
        title: 'SEC_EMERGENCY',
        description: 'Need help 123456789',
        serviceId: serviceA.id,
        locationLat: 10.0,
        locationLng: 10.0,
        scheduledFor: new Date().toISOString(),
        isEmergency: true,
    });
    console.log("Clean creation response:", createResClean.body);
    const task = createResClean.body.task;
    if (!task) {
       console.log("No task created, body:", createResClean.body);
       process.exit(1);
    }
`;

code = code.replace(/const createResClean = await makeRequest\('POST', '\/tasks', tokenReq1, \{[\s\S]*?\}\);[\s\S]*?const task = createResClean\.body\.task;/, replacement);

fs.writeFileSync('check_security.ts', code);
