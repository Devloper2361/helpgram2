import { UserRole, TaskStatus, DisputeStatus, TransactionType, TransactionStatus, VerificationStatus, NotificationType, MessageType, OrganizationStatus, MembershipStatus, MembershipRole, ClaimStatus } from "../lib/enums.js";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { PrismaClient } from "@prisma/client";

import { authenticate } from "./middleware/auth.js";

const router = Router();

// 1. GET /api/welfare/profile
router.get("/profile", authenticate, async (req: any, res: any) => {
  try {
    if (req.user.role !== "WORKER") {
      return res.status(403).json({
        error: "Only workers can access their welfare profile"
      });
    }

    const profile = await prisma.workerWelfareProfile.findUnique({
      where: { workerId: req.user.userId }
    });

    if (!profile) {
      return res.json({
        profile: { isCovered: false }
      });
    }

    res.json({ profile });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

// 2. GET /api/welfare/claims
router.get("/claims", authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    if (role === "CUSTOMER") {
      return res.status(403).json({
        error: "Customers cannot access welfare claims"
      });
    }

    let claims = [];

    if (role === "WORKER") {
      claims = await prisma.welfareClaim.findMany({
        where: {
          workerId: userId
        },
        orderBy: {
          createdAt: "desc"
        }
      });
    } else if (role === "SOCIETY_ADMIN") {
      const user = await prisma.user.findUnique({
        where: {
          id: userId
        },
        include: {
          societyMemberships: {
            where: {
              status: "ACTIVE",
              role: "ADMIN"
            },
            select: {
              societyId: true
            }
          }
        }
      });

      const societyIds =
        user?.societyMemberships.map(m => m.societyId) || [];

      claims = await prisma.welfareClaim.findMany({
        where: {
          worker: {
            societyMemberships: {
              some: {
                societyId: {
                  in: societyIds
                },
                status: "ACTIVE"
              }
            }
          }
        },
        include: {
          worker: {
            select: {
              email: true,
              profile: {
                select: {
                  fullName: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      });
    } else if (role === "FEDERATION_ADMIN") {
      const user = await prisma.user.findUnique({
        where: {
          id: userId
        },
        include: {
          federationMemberships: {
            where: {
              status: "ACTIVE",
              role: "ADMIN"
            },
            select: {
              federationId: true
            }
          }
        }
      });

      const fedIds =
        user?.federationMemberships.map(m => m.federationId) || [];

      claims = await prisma.welfareClaim.findMany({
        where: {
          worker: {
            societyMemberships: {
              some: {
                status: "ACTIVE",
                society: {
                  federationId: {
                    in: fedIds
                  }
                }
              }
            }
          }
        },
        include: {
          worker: {
            select: {
              email: true,
              profile: {
                select: {
                  fullName: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      });
    } else if (role === "ADMIN" || role === "PLATFORM_ADMIN") {
      claims = await prisma.welfareClaim.findMany({
        include: {
          worker: {
            select: {
              email: true,
              profile: {
                select: {
                  fullName: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      });
    }

    res.json({
      claims
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

const submitClaimSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  incidentDate: z.string().datetime().optional()
}).strict();

// 3. POST /api/welfare/claims
router.post("/claims", authenticate, async (req: any, res: any) => {
  try {
    if (req.user.role !== "WORKER") {
      return res.status(403).json({
        error: "Only workers can submit claims"
      });
    }

    const data = submitClaimSchema.parse(req.body);

    const claim = await prisma.welfareClaim.create({
      data: {
        workerId: req.user.userId,
        title: data.title,
        description: data.description,
        ...(data.incidentDate && {
          incidentDate: new Date(data.incidentDate)
        }),
        status: "PENDING"
      }
    });

    res.status(201).json({
      claim
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: error.flatten()
      });
    }

    console.error(error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

const updateClaimStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"])
}).strict();

// 4. PUT /api/welfare/claims/:id/status
router.put("/claims/:id/status", authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const role = req.user.role;

    // Workers and customers can never modify claim status.
    if (role === "WORKER" || role === "CUSTOMER") {
      return res.status(403).json({
        error: "Unauthorized to modify claim status"
      });
    }

    const data = updateClaimStatusSchema.parse(req.body);

    const claim = await prisma.welfareClaim.findUnique({
      where: {
        id
      },
      include: {
        worker: true
      }
    });

    if (!claim) {
      return res.status(404).json({
        error: "Claim not found"
      });
    }

    // Only pending claims can be processed.
    if (claim.status !== "PENDING") {
      return res.status(400).json({
        error: "Claim has already been processed"
      });
    }

    /*
     * Authorization / jurisdiction
     *
     * PLATFORM_ADMIN:
     *   Global access.
     *
     * SOCIETY_ADMIN:
     *   Can only process claims belonging to workers
     *   in one of their active societies.
     *
     * ADMIN:
     *   Can only process claims belonging to workers
     *   in one of their active society memberships.
     *
     * FEDERATION_ADMIN:
     *   Can only process claims belonging to workers
     *   in societies belonging to one of their active federations.
     */

    if (role === "SOCIETY_ADMIN" || role === "ADMIN") {
      const admin = await prisma.user.findUnique({
        where: {
          id: userId
        },
        include: {
          societyMemberships: {
            where: {
              status: "ACTIVE",
              role: "ADMIN"
            },
            select: {
              societyId: true
            }
          }
        }
      });

      const adminSocietyIds =
        admin?.societyMemberships.map(m => m.societyId) || [];

      if (adminSocietyIds.length === 0) {
        return res.status(403).json({
          error: "No active society administration membership"
        });
      }

      const workerMembership =
        await prisma.societyMembership.findFirst({
          where: {
            userId: claim.workerId,
            societyId: {
              in: adminSocietyIds
            },
            status: "ACTIVE"
          },
          select: {
            societyId: true
          }
        });

      if (!workerMembership) {
        return res.status(403).json({
          error: "Worker not in your society"
        });
      }
    } else if (role === "FEDERATION_ADMIN") {
      const admin = await prisma.user.findUnique({
        where: {
          id: userId
        },
        include: {
          federationMemberships: {
            where: {
              status: "ACTIVE",
              role: "ADMIN"
            },
            select: {
              federationId: true
            }
          }
        }
      });

      const adminFedIds =
        admin?.federationMemberships.map(m => m.federationId) || [];

      if (adminFedIds.length === 0) {
        return res.status(403).json({
          error: "No active federation administration membership"
        });
      }

      const workerMembership =
        await prisma.societyMembership.findFirst({
          where: {
            userId: claim.workerId,
            status: "ACTIVE",
            society: {
              federationId: {
                in: adminFedIds
              }
            }
          },
          select: {
            societyId: true
          }
        });

      if (!workerMembership) {
        return res.status(403).json({
          error: "Worker not in your federation"
        });
      }
    } else if (role !== "PLATFORM_ADMIN") {
      // Deny any unexpected administrative role by default.
      return res.status(403).json({
        error: "Unauthorized to modify claim status"
      });
    }

    const updatedClaim = await prisma.welfareClaim.update({
      where: {
        id
      },
      data: {
        status: data.status as ClaimStatus
      }
    });

    // Notify worker after successful status change.
    await prisma.notification.create({
      data: {
        userId: claim.workerId,
        title: "Claim Status Updated",
        message: `Your welfare claim "${claim.title}" has been ${data.status}.`,
        type: "SYSTEM"
      }
    }).catch(console.error);

    res.json({
      claim: updatedClaim
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: error.flatten()
      });
    }

    console.error(error);

    res.status(500).json({
      error: "Internal server error"
    });
  }
});

const updateProfileSchema = z.object({
  isCovered: z.boolean(),
  coverageType: z.string().max(100).optional(),
  coverageAmount: z.number().min(0).max(1000000000).optional(),
  validUntil: z.string().datetime().optional(),
  policyNumber: z.string().max(100).optional()
}).strict();

// 5. PUT /api/welfare/profile/:workerId
router.put("/profile/:workerId", authenticate, async (req: any, res: any) => {
  try {
    const { workerId } = req.params;
    const userId = req.user.userId;
    const role = req.user.role;

    if (role === "WORKER" || role === "CUSTOMER") {
      return res.status(403).json({
        error: "Unauthorized"
      });
    }

    const data = updateProfileSchema.parse(req.body);

    // Verify admin jurisdiction
    if (role === "SOCIETY_ADMIN" || role === "ADMIN") {
      const admin = await prisma.user.findUnique({
        where: {
          id: userId
        },
        include: {
          societyMemberships: {
            where: {
              status: "ACTIVE",
              role: "ADMIN"
            },
            select: {
              societyId: true
            }
          }
        }
      });

      const adminSocietyIds =
        admin?.societyMemberships.map(m => m.societyId) || [];

      if (adminSocietyIds.length === 0) {
        return res.status(403).json({
          error: "No active society administration membership"
        });
      }

      const workerMembership =
        await prisma.societyMembership.findFirst({
          where: {
            userId: workerId,
            societyId: {
              in: adminSocietyIds
            },
            status: "ACTIVE"
          },
          select: {
            societyId: true
          }
        });

      if (!workerMembership) {
        return res.status(403).json({
          error: "Worker not in your society"
        });
      }
    } else if (role === "FEDERATION_ADMIN") {
      const admin = await prisma.user.findUnique({
        where: {
          id: userId
        },
        include: {
          federationMemberships: {
            where: {
              status: "ACTIVE",
              role: "ADMIN"
            },
            select: {
              federationId: true
            }
          }
        }
      });

      const adminFedIds =
        admin?.federationMemberships.map(m => m.federationId) || [];

      if (adminFedIds.length === 0) {
        return res.status(403).json({
          error: "No active federation administration membership"
        });
      }

      const workerMembership =
        await prisma.societyMembership.findFirst({
          where: {
            userId: workerId,
            status: "ACTIVE",
            society: {
              federationId: {
                in: adminFedIds
              }
            }
          },
          select: {
            societyId: true
          }
        });

      if (!workerMembership) {
        return res.status(403).json({
          error: "Worker not in your federation"
        });
      }
    } else if (role !== "PLATFORM_ADMIN") {
      return res.status(403).json({
        error: "Unauthorized"
      });
    }

    const profile = await prisma.workerWelfareProfile.upsert({
      where: {
        workerId
      },
      update: {
        isCovered: data.isCovered,
        ...(data.coverageType !== undefined && {
          coverageType: data.coverageType
        }),
        ...(data.coverageAmount !== undefined && {
          coverageAmount: data.coverageAmount
        }),
        ...(data.validUntil !== undefined && {
          validUntil: data.validUntil
            ? new Date(data.validUntil)
            : null
        }),
        ...(data.policyNumber !== undefined && {
          policyNumber: data.policyNumber
        })
      },
      create: {
        workerId,
        isCovered: data.isCovered,
        ...(data.coverageType && {
          coverageType: data.coverageType
        }),
        ...(data.coverageAmount && {
          coverageAmount: data.coverageAmount
        }),
        ...(data.validUntil && {
          validUntil: new Date(data.validUntil)
        }),
        ...(data.policyNumber && {
          policyNumber: data.policyNumber
        })
      }
    });

    res.json({
      profile
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: error.flatten()
      });
    }

    console.error(error);

    res.status(500).json({
      error: "Internal server error"
    });
  }
});

// 6. GET /api/welfare/workers
// Helper to get workers and their welfare profiles for admins
router.get("/workers", authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    if (role === "CUSTOMER" || role === "WORKER") {
      return res.status(403).json({
        error: "Unauthorized"
      });
    }

    let workers = [];

    if (role === "SOCIETY_ADMIN") {
      const user = await prisma.user.findUnique({
        where: {
          id: userId
        },
        include: {
          societyMemberships: {
            where: {
              status: "ACTIVE",
              role: "ADMIN"
            },
            select: {
              societyId: true
            }
          }
        }
      });

      const societyIds =
        user?.societyMemberships.map(m => m.societyId) || [];

      workers = await prisma.user.findMany({
        where: {
          role: "WORKER",
          societyMemberships: {
            some: {
              societyId: {
                in: societyIds
              },
              status: "ACTIVE"
            }
          }
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          profile: {
            select: {
              fullName: true
            }
          },
          welfareProfile: true
        }
      });
    } else if (role === "FEDERATION_ADMIN") {
      const user = await prisma.user.findUnique({
        where: {
          id: userId
        },
        include: {
          federationMemberships: {
            where: {
              status: "ACTIVE",
              role: "ADMIN"
            },
            select: {
              federationId: true
            }
          }
        }
      });

      const fedIds =
        user?.federationMemberships.map(m => m.federationId) || [];

      workers = await prisma.user.findMany({
        where: {
          role: "WORKER",
          societyMemberships: {
            some: {
              status: "ACTIVE",
              society: {
                federationId: {
                  in: fedIds
                }
              }
            }
          }
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          profile: {
            select: {
              fullName: true
            }
          },
          welfareProfile: true
        }
      });
    } else if (role === "ADMIN" || role === "PLATFORM_ADMIN") {
      workers = await prisma.user.findMany({
        where: {
          role: "WORKER"
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          profile: {
            select: {
              fullName: true
            }
          },
          welfareProfile: true
        }
      });
    }

    res.json({
      workers
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Internal server error"
    });
  }
});

export { router as welfareRoutes };