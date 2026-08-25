import re

with open("src/api/dashboard.routes.ts", "r") as f:
    text = f.read()

# Replace the first instance (/society)
text = re.sub(
    r'    \} else if \(userRole === "PLATFORM_ADMIN" \|\| userRole === "ADMIN"\) \{\s*if \(targetFederationId\).*?\} else \{',
    """    } else if (userRole === "PLATFORM_ADMIN" || userRole === "ADMIN") {
      if (targetSocietyId) {
        const society = await prisma.cooperativeSociety.findUnique({
          where: { id: targetSocietyId }
        });
        if (!society) {
          return res.status(404).json({ error: "Society not found" });
        }
      }
    } else {""",
    text,
    count=1,
    flags=re.DOTALL
)

# Wait, what if the second instance is also broken? Let's fix both safely.
# I will just write a script that replaces the entire `dashboard.routes.ts` file from task 347 output, but with the fix.

