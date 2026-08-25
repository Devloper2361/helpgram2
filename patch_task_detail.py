import re

with open("src/pages/TaskDetail.tsx", "r") as f:
    text = f.read()

# Add import if missing
if 'import { toast } from "sonner";' not in text:
    text = text.replace('import { Button } from "@/components/ui/button";', 'import { Button } from "@/components/ui/button";\nimport { toast } from "sonner";')

# Remove confirm for handleSelectHelper
text = text.replace(
    'if (!confirm("Select this helper to perform the task?")) return;',
    ''
)

# Remove confirm for handleCancelTask
text = text.replace(
    'if (!confirm("Are you sure you want to cancel this task?")) return;',
    ''
)

# Replace alert with toast.error or toast.success
text = text.replace('alert("Dispute submitted. Admins will review it soon.");', 'toast.success("Dispute submitted. Admins will review it soon.");')
text = text.replace('alert(typeof data.error === "string" ? data.error : (data.error?.formErrors?.[0] || JSON.stringify(data.error)));', 'toast.error(typeof data.error === "string" ? data.error : (data.error?.formErrors?.[0] || JSON.stringify(data.error)));')
text = text.replace('alert("Review submitted!");', 'toast.success("Review submitted!");')
text = text.replace('alert("Please log in to apply");', 'toast.error("Please log in to apply");')
text = text.replace('alert("Applied successfully!");', 'toast.success("Applied successfully!");')
text = text.replace('alert(typeof data.error === "string" ? data.error : (data.error?.formErrors?.[0] || JSON.stringify(data.error) || "Failed to apply"));', 'toast.error(typeof data.error === "string" ? data.error : (data.error?.formErrors?.[0] || JSON.stringify(data.error) || "Failed to apply"));')
text = text.replace('alert(typeof d.error === "string" ? d.error : (d.error?.formErrors?.[0] || JSON.stringify(d.error) || "Failed to select helper"));', 'toast.error(typeof d.error === "string" ? d.error : (d.error?.formErrors?.[0] || JSON.stringify(d.error) || "Failed to select helper"));')
text = text.replace('catch(() => alert("Failed to select helper"));', 'catch(() => toast.error("Failed to select helper"));')
text = text.replace('alert(d.error);', 'toast.error(d.error);')


with open("src/pages/TaskDetail.tsx", "w") as f:
    f.write(text)

