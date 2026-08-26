import re

with open("src/pages/TaskDetail.tsx", "r") as f:
    text = f.read()

text = text.replace(
    '} catch (e) {\n      console.error(e);\n    }',
    '} catch (e) {\n      console.log(e);\n    }'
)

with open("src/pages/TaskDetail.tsx", "w") as f:
    f.write(text)

