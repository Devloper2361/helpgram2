with open("server.ts", "r") as f:
    text = f.read()

text = text.replace(
    'console.error("GLOBAL Unhandled error:", err, err.stack);',
    'console.error("GLOBAL Unhandled error:", err?.message || err);'
)

with open("server.ts", "w") as f:
    f.write(text)
