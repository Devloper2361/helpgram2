import re

with open('src/pages/Marketplace.tsx', 'r') as f:
    content = f.read()

target = """                    {task.category && (
                      <Badge variant="outline" className="text-xs text-slate-500">
                        {task.category}
                      </Badge>
                    )}"""

replacement = """                    {task.category && (
                      <Badge variant="outline" className="text-xs text-slate-500">
                        {task.category}
                      </Badge>
                    )}
                    {task.serviceId ? (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-50 border-none">
                        Service Task
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-100 border-none">
                        Legacy Task
                      </Badge>
                    )}"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/pages/Marketplace.tsx', 'w') as f:
        f.write(content)
    print("Marketplace patched successfully")
else:
    print("Target not found in Marketplace")
