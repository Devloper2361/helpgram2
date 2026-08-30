const fs = require('fs');
let code = fs.readFileSync('src/components/WorkforceIntelligenceTab.tsx', 'utf8');
code = code.replace(
  'const generateInsights = async () => {',
  'const generateInsights = async (e: React.MouseEvent) => {\n    e.preventDefault();\n    console.log("CLICK TRIGGERED, starting fetch to /api/intelligence/insights");\n'
);
code = code.replace(
  'const res = await fetch(`/api/intelligence/insights`, {',
  'console.log("SENDING REQUEST with payload:", { societyId });\n      const res = await fetch(`/api/intelligence/insights`, {'
);
code = code.replace(
  'if (res.ok) {',
  'console.log("HTTP STATUS:", res.status);\n      if (res.ok) {\n        console.log("RESPONSE OK");\n'
);
code = code.replace(
  'setAiError("AI insights are temporarily unavailable. Workforce analytics are still available.");',
  'const errText = await res.text();\n        console.log("SERVER ERROR BODY:", errText);\n        setAiError(`HTTP ${res.status}: AI insights are temporarily unavailable.`);'
);
code = code.replace(
  'catch (err) {',
  'catch (err: any) {\n      console.log("FRONTEND CATCH ERROR:", err.message);\n'
);
fs.writeFileSync('src/components/WorkforceIntelligenceTab.tsx', code);
