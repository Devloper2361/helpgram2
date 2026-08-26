import re

with open("src/pages/PublicProfile.tsx", "r") as f:
    text = f.read()

text = text.replace(
    '.catch(console.error)',
    '.catch(err => { console.log(err); })'
)

with open("src/pages/PublicProfile.tsx", "w") as f:
    f.write(text)

with open("src/pages/Profile.tsx", "r") as f:
    text = f.read()

text = text.replace(
    '.catch(console.error);',
    '.catch(err => { console.log(err); });'
)
text = text.replace(
    '} catch (e) {\n      console.error(e);\n    }',
    '} catch (e) {\n      console.log(e);\n    }'
)

with open("src/pages/Profile.tsx", "w") as f:
    f.write(text)

