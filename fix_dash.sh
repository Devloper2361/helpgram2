#!/bin/bash
sed -i 's/if (!targetSocietyId) {/if (false) {/' src/api/dashboard.routes.ts
sed -i 's/where: { societyId: targetSocietyId, role: "MEMBER" }/where: targetSocietyId ? { societyId: targetSocietyId, role: "MEMBER" } : { role: "MEMBER" }/' src/api/dashboard.routes.ts
sed -i 's/if (!targetFederationId) {/if (false) {/' src/api/dashboard.routes.ts
sed -i 's/where: { federationId: targetFederationId }/where: targetFederationId ? { federationId: targetFederationId } : {}/' src/api/dashboard.routes.ts
# Also fix the findUnique for society and federation
sed -i 's/const society = await prisma.cooperativeSociety.findUnique({/if(targetSocietyId) { const society = await prisma.cooperativeSociety.findUnique({/' src/api/dashboard.routes.ts
sed -i 's/return res.status(404).json({ error: "Society not found" });/return res.status(404).json({ error: "Society not found" }); } }/' src/api/dashboard.routes.ts

sed -i 's/const federation = await prisma.cooperativeFederation.findUnique({/if(targetFederationId) { const federation = await prisma.cooperativeFederation.findUnique({/' src/api/dashboard.routes.ts
sed -i 's/return res.status(404).json({ error: "Federation not found" });/return res.status(404).json({ error: "Federation not found" }); } }/' src/api/dashboard.routes.ts
