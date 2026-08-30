const fs = require('fs');
let code = fs.readFileSync('src/components/IntelligencePanel.tsx', 'utf8');
code = code.replace(
  'const generateAiInsight = async () => {',
  'const generateAiInsight = async (e: React.MouseEvent) => {\n    e.preventDefault();\n    console.log("CLICK TRIGGERED");\n    alert("CLICK TRIGGERED");\n'
);
fs.writeFileSync('src/components/IntelligencePanel.tsx', code);
