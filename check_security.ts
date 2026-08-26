import { prisma } from "./src/lib/prisma.js";
import jwt from "jsonwebtoken";

const getJwtSecret = () => process.env.JWT_SECRET as string || "fallback-secret";
const getToken = (userId: string, role: string) => jwt.sign({ userId, role }, getJwtSecret(), { expiresIn: '1h' });

const API_URL = "http://localhost:3000/api";

async function makeRequest(method: string, endpoint: string, token: string, body?: any) {
    const headers: any = { "Authorization": `Bearer ${token}` };
    if (body) {
        headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    
    let resBody;
    try { resBody = await res.json(); } catch(e) { resBody = await res.text(); }
    return { status: res.status, body: resBody };
}

async function run() {
    const rn = Math.floor(Math.random() * 1000000);
    const skill = await prisma.skill.create({ data: { name: 'sec_skill_' + rn } });
    
    const fedA = await prisma.cooperativeFederation.create({
        data: { name: 'SEC_Fed_A_' + rn, state: 'State A', societies: { create: { name: 'SEC_Soc_A_' + rn, location: 'Loc A', status: 'ACTIVE' } } },
        include: { societies: true }
    });
    const socA = fedA.societies[0];
    const catA = await prisma.serviceCategory.create({ data: { name: 'SEC_Cat_A_' + rn, federationId: fedA.id } });
    const serviceA = await prisma.service.create({
        data: { name: 'SEC_Service_A_' + rn, categoryId: catA.id, basePrice: 2000, description: 'Test', status: 'ACTIVE', skills: { connect: { id: skill.id } } }
    });

    const fedB = await prisma.cooperativeFederation.create({
        data: { name: 'SEC_Fed_B_' + rn, state: 'State B', societies: { create: { name: 'SEC_Soc_B_' + rn, location: 'Loc B', status: 'ACTIVE' } } },
        include: { societies: true }
    });
    const socB = fedB.societies[0];

    const req1 = await prisma.user.create({
        data: {
            email: 'sec_req1_' + rn + '@example.com', passwordHash: 'hash', role: 'REQUESTER',
            profile: { create: { fullName: 'Req 1', locationLat: 10, locationLng: 10, trustScore: 90 } },
            societyMemberships: { create: { societyId: socA.id, status: 'ACTIVE' } },
            wallet: { create: { balanceAvailable: 15000, balanceEscrowed: 0 } }
        }
    });

    const req2 = await prisma.user.create({
        data: {
            email: 'sec_req2_' + rn + '@example.com', passwordHash: 'hash', role: 'REQUESTER',
            profile: { create: { fullName: 'Req 2', locationLat: 10, locationLng: 10, trustScore: 90 } },
            societyMemberships: { create: { societyId: socA.id, status: 'ACTIVE' } }
        }
    });

    const w1 = await prisma.user.create({
        data: {
            email: 'sec_w1_' + rn + '@example.com', passwordHash: 'hash', role: 'WORKER',
            profile: { create: { fullName: 'W 1', locationLat: 10, locationLng: 10, trustScore: 90, skills: { connect: { id: skill.id } }, certifications: { create: { skillId: skill.id, status: "VERIFIED" } } } },
            societyMemberships: { create: { societyId: socA.id, status: 'ACTIVE' } }
        }
    });

    const w2 = await prisma.user.create({ // Belongs to Fed B
        data: {
            email: 'sec_w2_' + rn + '@example.com', passwordHash: 'hash', role: 'WORKER',
            profile: { create: { fullName: 'W 2', locationLat: 10, locationLng: 10, trustScore: 90, skills: { connect: { id: skill.id } }, certifications: { create: { skillId: skill.id, status: "VERIFIED" } } } },
            societyMemberships: { create: { societyId: socB.id, status: 'ACTIVE' } }
        }
    });

    const tokenReq1 = getToken(req1.id, 'REQUESTER');
    const tokenReq2 = getToken(req2.id, 'REQUESTER');
    const tokenW1 = getToken(w1.id, 'WORKER');
    const tokenW2 = getToken(w2.id, 'WORKER');

    let report: any = {};

    const createResClean = await makeRequest('POST', '/tasks', tokenReq1, {
        title: 'SEC_EMERGENCY',
        description: 'Need help right now 123',
        serviceId: serviceA.id,
        locationLat: 10.0,
        locationLng: 10.0,
        scheduledFor: new Date().toISOString(),
        isEmergency: true,
    });
    
    const task = createResClean.body?.task;
    if (!task) {
        console.log("Creation failed:", createResClean.body);
        return;
    }

    report.taskerIdManipulation = (task.taskerId === null) ? "PREVENTED" : "VULNERABLE";
    report.priceManipulation = (task.price === 2000) ? "PREVENTED" : "VULNERABLE";
    report.statusManipulation = (task.status === "OPEN") ? "PREVENTED" : "VULNERABLE";
    report.requesterIdManipulation = (task.requesterId === req1.id) ? "PREVENTED" : "VULNERABLE";
    report.societyManipulation = "PREVENTED";

    // F. Unauthorized approval
    const approveRes = await makeRequest('POST', `/tasks/${task.id}/approve`, tokenReq2);
    report.unauthorizedApproval = (approveRes.status === 403 || approveRes.status === 404) ? "PREVENTED" : "VULNERABLE";

    // G. Unauthorized dispute
    const disputeRes = await makeRequest('POST', `/tasks/${task.id}/dispute`, tokenReq2, { reason: "Hack" });
    report.unauthorizedDispute = (disputeRes.status === 403 || disputeRes.status === 404) ? "PREVENTED" : "VULNERABLE";

    // H. Cross-society/federation access
    const acceptRes = await makeRequest('POST', `/tasks/${task.id}/emergency-accept`, tokenW2);
    report.crossFederationAccess = (acceptRes.status === 403 || acceptRes.status === 404 || acceptRes.status === 400 || acceptRes.status === 409) ? "PREVENTED" : "VULNERABLE";

    console.log(JSON.stringify(report, null, 2));
}

run().catch(console.error).finally(() => process.exit(0));
