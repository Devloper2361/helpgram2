const fs = require('fs');

let code = fs.readFileSync('src/api/tasks.routes.ts', 'utf8');

const imports = `import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ storage: storage });
`;

code = code.replace(/import \{ authenticate \} from "\.\.\/middleware\/auth\.js";/, "import { authenticate } from \"../middleware/auth.js\";\n" + imports);

const submitProofRegex = /router\.post\("\/:id\/submit-proof"[\s\S]*?res\.status\(500\)\.json\(\{ error: "Internal server error" \}\);\s*\}\s*\}\);/;

const proofRepl = `router.post("/:id/submit-proof", authenticate, upload.single('evidence'), async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (task.taskerId !== userId) return res.status(403).json({ error: "Unauthorized. Only accepted helper can submit proof." });
    if (task.status !== TaskStatus.IN_PROGRESS) return res.status(400).json({ error: "Cannot submit proof from current status." });

    if (!req.file) {
      return res.status(400).json({ error: "No evidence file uploaded" });
    }

    const fileUrl = \`/uploads/\${req.file.filename}\`;

    const updatedTask = await prisma.$transaction(async (tx) => {
      await tx.mediaAttachment.create({
        data: {
          taskId: task.id,
          url: fileUrl,
          fileType: req.file.mimetype,
          uploadedBy: userId
        }
      });

      return await tx.task.update({
        where: { id, version: task.version },
        data: {
          status: TaskStatus.PROOF_SUBMITTED,
          version: { increment: 1 }
        }
      });
    }, { maxWait: 15000, timeout: 15000 });

    res.json({ task: updatedTask, fileUrl });
  } catch (error: any) {
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});`;

code = code.replace(submitProofRegex, proofRepl);

fs.writeFileSync('src/api/tasks.routes.ts', code);
