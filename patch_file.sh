#!/bin/bash
sed -i 's/if (false) {/if (!targetSocietyId) {/' src/api/dashboard.routes.ts
sed -i 's/if (!targetSocietyId) {/if (targetSocietyId \&\& !targetSocietyId) {/' src/api/dashboard.routes.ts
sed -i 's/if (!targetFederationId) {/if (targetFederationId \&\& !targetFederationId) {/' src/api/dashboard.routes.ts
