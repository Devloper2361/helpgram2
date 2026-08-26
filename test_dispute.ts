import { prisma } from "./src/lib/prisma.js";
import jwt from "jsonwebtoken";

const getJwtSecret = () => process.env.JWT_SECRET as string || "fallback-secret";
const getToken = (userId: string, role: string) => jwt.sign({ userId, role }, getJwtSecret(), { expiresIn: '1h' });
const API_URL = "http://localhost:3000/api";

async function makeRequest(method: string, endpoint: string, token: string, body?: any) {
    const headers: any = { "Authorization": `Bearer ${token}` };
    if (body) headers["Content-Type"] = "application/json";
    const res = await fetch(`${API_URL}${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    let resBody;
    try { resBody = await res.json(); } catch(e) { resBody = await res.text(); }
    return { status: res.status, body: resBody };
}

async function runDisputeTest() {
    console.log("Setting up DISP_ environment...");
    const rn = Math.floor(Math.random() * 100000);
    const skill = await prisma.skill.create({ data: { name: 'DISP_skill_' + rn } });
    const fed = await prisma.cooperativeFederation.create({
        data: { name: 'DISP_Fed_' + rn, state: 'State', societies: { create: { name: 'DISP_Soc_' + rn, location: 'Loc', status: 'ACTIVE' } } },
        include: { societies: true }
    });
    const soc = fed.societies[0];
    const cat = await prisma.serviceCategory.create({ data: { name: 'DISP_Cat_' + rn, federationId: fed.id } });
    const service = await prisma.service.create({
        data: { name: 'DISP_Service_' + rn, categoryId: cat.id, basePrice: 2000, description: 'Test', status: 'ACTIVE', skills: { connect: { id: skill.id } } }
    });

    const reqA = await prisma.user.create({
        data: { email: 'disp_reqA_' + rn + '@example.com', passwordHash: 'hash', role: 'REQUESTER', profile: { create: { fullName: 'Req A', locationLat: 10, locationLng: 10, trustScore: 90 } }, wallet: { create: { balanceAvailable: 15000, balanceEscrowed: 0 } } }
    });
    const reqB = await prisma.user.create({
        data: { email: 'disp_reqB_' + rn + '@example.com', passwordHash: 'hash', role: 'REQUESTER', profile: { create: { fullName: 'Req B', locationLat: 10, locationLng: 10, trustScore: 90 } }, wallet: { create: { balanceAvailable: 15000, balanceEscrowed: 0 } } }
    });
    const wA = await prisma.user.create({
        data: { 
            email: 'disp_wA_' + rn + '@example.com', 
            passwordHash: 'hash', 
            role: 'WORKER', 
            profile: { create: { fullName: 'W A', locationLat: 10, locationLng: 10, trustScore: 90, skills: { connect: { id: skill.id } }, certifications: { create: { skillId: skill.id, status: "VERIFIED" } } } }, 
            societyMemberships: { create: { societyId: soc.id, status: 'ACTIVE' } },
            kycVerification: { create: { status: 'VERIFIED', documentsUrl: 'url' } }
        }
    });

    const tReqA = getToken(reqA.id, 'REQUESTER');
    const tReqB = getToken(reqB.id, 'REQUESTER');
    const tWA = getToken(wA.id, 'WORKER');

    const createRes = await makeRequest('POST', '/tasks', tReqA, { title: 'DISP_TASK_' + rn, description: 'Help needed right now', serviceId: service.id, locationLat: 10.0, locationLng: 10.0, scheduledFor: new Date().toISOString(), isEmergency: false });
    
    if (createRes.status !== 201) {
       console.log("Create failed:", createRes.body);
       process.exit(1);
    }
    
    const taskId = createRes.body.task.id;

    // Normal acceptance flow
    const applyRes = await makeRequest('POST', `/tasks/${taskId}/apply`, tWA);
    if (applyRes.status !== 200 && applyRes.status !== 201) {
       console.log("Apply failed:", applyRes.body);
       process.exit(1);
    }
    const selectRes = await makeRequest('POST', `/tasks/${taskId}/select-helper`, tReqA, { taskerId: wA.id });
    if (selectRes.status !== 200) {
       console.log("Select failed:", selectRes.body);
       process.exit(1);
    }

    // Requester B (unauthorized) attempts dispute
    const unauthDispute = await makeRequest('POST', `/tasks/${taskId}/dispute`, tReqB, { reason: "Hack attempt" });
    console.log("Unauth Dispute HTTP Status:", unauthDispute.status);

    const disputesUnauth = await prisma.dispute.findMany({ where: { taskId } });
    console.log("Disputes created by unauth:", disputesUnauth.length);
    const taskUnauth = await prisma.task.findUnique({ where: { id: taskId }, include: { escrowEntry: true } });
    console.log("Task status after unauth:", taskUnauth?.status);
    console.log("Escrow status after unauth:", taskUnauth?.escrowEntry?.status);

    // Requester A (authorized) attempts dispute
    const authDispute = await makeRequest('POST', `/tasks/${taskId}/dispute`, tReqA, { reason: "Legit dispute" });
    console.log("Auth Dispute HTTP Status:", authDispute.status);
    const taskAuth = await prisma.task.findUnique({ where: { id: taskId }, include: { escrowEntry: true } });
    console.log("Task status after auth:", taskAuth?.status);
}

runDisputeTest().catch(console.error).finally(() => process.exit(0));
