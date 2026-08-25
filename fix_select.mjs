import fs from 'fs';
let content = fs.readFileSync('src/pages/TaskDetail.tsx', 'utf8');

const target = `  const handleSelectHelper = async (taskerId: string) => {
    if (!confirm("Select this helper to perform the task?")) return;
    try {
      const res = await fetch(\`/api/tasks/\${id}/select-helper\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskerId })
      });
      if (res.ok) fetchTask();
    } catch (e) {}
  };`;

const replacement = `  const handleSelectHelper = async (taskerId: string) => {
    if (!confirm("Select this helper to perform the task?")) return;
    try {
      const res = await fetch(\`/api/tasks/\${id}/select-helper\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskerId })
      });
      if (res.ok) fetchTask();
      else { res.json().then((d: any) => alert(d.error)).catch(() => alert("Failed to select helper")); }
    } catch (e) {}
  };`;

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/TaskDetail.tsx', content);
