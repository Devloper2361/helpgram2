import re

with open('src/api/tasks.routes.ts', 'r') as f:
    content = f.read()

target = """    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: "insensitive" } },
        { description: { contains: String(search), mode: "insensitive" } },
        { address: { contains: String(search), mode: "insensitive" } },
        { city: { contains: String(search), mode: "insensitive" } },
        { category: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const tasks = await prisma.task.findMany({"""

replacement = """    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: "insensitive" } },
        { description: { contains: String(search), mode: "insensitive" } },
        { address: { contains: String(search), mode: "insensitive" } },
        { city: { contains: String(search), mode: "insensitive" } },
        { category: { contains: String(search), mode: "insensitive" } },
      ];
    }

    if (req.user?.role === "WORKER") {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          profile: { include: { skills: true } },
          societyMemberships: {
            where: { status: "ACTIVE" },
            include: { society: true }
          }
        }
      });
      
      const workerFederationIds = user?.societyMemberships.map((m: any) => m.society.federationId) || [];
      const workerSkillIds = user?.profile?.skills.map((s: any) => s.id) || [];

      const workerFilter = {
        OR: [
          { serviceId: null },
          {
            service: {
              status: "ACTIVE",
              category: {
                federationId: { in: workerFederationIds }
              },
              skills: {
                none: {
                  id: { notIn: workerSkillIds }
                }
              }
            }
          }
        ]
      };

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          workerFilter
        ];
        delete where.OR;
      } else {
        Object.assign(where, workerFilter);
      }
    }

    const tasks = await prisma.task.findMany({"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/api/tasks.routes.ts', 'w') as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Target not found")
