with open("server.ts", "r") as f:
    text = f.read()
text = text.replace(
    'app.listen(Number(process.env.PORT || 3000), "0.0.0.0", () => {\n  console.log(`Server listening on ${process.env.PORT || 3000}`);\n});',
    'app.listen(3000, "0.0.0.0", () => {\n  console.log(`Server listening on 3000`);\n});'
)
with open("server.ts", "w") as f:
    f.write(text)
