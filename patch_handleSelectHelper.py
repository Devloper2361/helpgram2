import re

with open("src/pages/TaskDetail.tsx", "r") as f:
    text = f.read()

text = text.replace(
    'const handleSelectHelper = async (taskerId: string) => {',
    'const handleSelectHelper = async (taskerId: string) => {\n    console.log("handleSelectHelper called with taskerId:", taskerId);\n    console.log("Fetching /api/tasks/" + id + "/select-helper");'
)

text = text.replace(
    'if (res.ok) fetchTask();\n      else { res.json().then((d: any) => alert(d.error)).catch(() => alert("Failed to select helper")); }',
    'console.log("Response status:", res.status);\n      if (res.ok) {\n        console.log("Success! Refetching task...");\n        fetchTask();\n      } else {\n        res.json().then((d: any) => {\n          console.log("Error response:", d);\n          alert(typeof d.error === "string" ? d.error : (d.error?.formErrors?.[0] || JSON.stringify(d.error) || "Failed to select helper"));\n        }).catch(() => alert("Failed to select helper"));\n      }'
)

with open("src/pages/TaskDetail.tsx", "w") as f:
    f.write(text)

