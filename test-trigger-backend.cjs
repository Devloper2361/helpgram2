const fs = require('fs');
let code = fs.readFileSync('src/api/intelligence.routes.ts', 'utf8');

code = code.replace(
  'intelligenceRouter.post("/insights", authenticate, async (req, res) => {',
  'intelligenceRouter.post("/insights", authenticate, async (req, res) => {\n  console.log("BACKEND /insights HIT. user role:", req.user?.role, "body:", req.body);\n'
);

code = code.replace(
  'const response = await ai.models.generateContent({',
  'console.log("SENDING TO GEMINI, model: gemini-3.6-flash");\n    const response = await ai.models.generateContent({'
);

code = code.replace(
  'const parsedData = AIResponseSchema.parse(data);',
  'console.log("RAW GEMINI TEXT:", text);\n    const parsedData = AIResponseSchema.parse(data);\n    console.log("SUCCESSFULLY PARSED DATA");\n'
);

code = code.replace(
  'console.error("AI Error:", err);',
  'console.error("AI Error THROWN:", err.message, err);\n'
);

fs.writeFileSync('src/api/intelligence.routes.ts', code);
