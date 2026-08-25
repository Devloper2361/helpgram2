import re

with open("src/pages/WelfareAdmin.tsx", "r") as f:
    content = f.read()

# We need to replace:
# <DialogTrigger asChild>
#   <Button variant="outline" size="sm" onClick={() => openProfileDialog(worker)}>
#     Edit Coverage
#   </Button>
# </DialogTrigger>

old_text = """                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => openProfileDialog(worker)}>
                        Edit Coverage
                      </Button>
                    </DialogTrigger>"""

new_text = """                    <DialogTrigger render={<Button variant="outline" size="sm" onClick={() => openProfileDialog(worker)} />}>
                      Edit Coverage
                    </DialogTrigger>"""

if old_text in content:
    content = content.replace(old_text, new_text)
    with open("src/pages/WelfareAdmin.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully!")
else:
    print("Text not found!")

