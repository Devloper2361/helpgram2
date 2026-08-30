const fs = require('fs');
const file = 'src/api/profile.routes.ts';
let code = fs.readFileSync(file, 'utf8');

const multerCode = `
import multer from "multer";
import path from "path";
import fs2 from "fs";

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs2.existsSync(uploadsDir)) {
  fs2.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});
`;

code = code.replace('const router = Router();', multerCode + '\nconst router = Router();');

const avatarCode = `
router.post("/avatar", authenticate, upload.single('avatar'), async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No avatar uploaded" });
    const fileUrl = '/uploads/' + req.file.filename;
    const userId = req.user.userId;
    const profile = await prisma.profile.update({
      where: { userId },
      data: { avatarUrl: fileUrl }
    });
    res.json({ avatarUrl: fileUrl });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});
`;

const certifyCode = `
router.post("/skills/:skillId/certify", authenticate, upload.single('evidence'), async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No evidence uploaded" });
    const fileUrl = '/uploads/' + req.file.filename;
    const userId = req.user.userId;
    const skillId = req.params.skillId;
    
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // Check if certification exists
    const existing = await prisma.certification.findFirst({
      where: { profileId: profile.id, skillId }
    });

    if (existing) {
      await prisma.certification.update({
        where: { id: existing.id },
        data: { evidence: fileUrl, status: "PENDING" }
      });
    } else {
      await prisma.certification.create({
        data: {
          profileId: profile.id,
          skillId,
          evidence: fileUrl,
          status: "PENDING"
        }
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});
`;

code = code.replace('export default router;', avatarCode + '\n' + certifyCode + '\nexport default router;');
// also allow location without being a url in updateProfileSchema
code = code.replace('avatarUrl: z.string().url().optional().or(z.literal("")),', 'avatarUrl: z.string().optional().or(z.literal("")),');

fs.writeFileSync(file, code);
