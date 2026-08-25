import re

with open("src/pages/CreateTask.tsx", "r") as f:
    text = f.read()

# Replace setAiError(err.error || "Failed to generate AI suggestion.");
# with setAiError(typeof err.error === 'string' ? err.error : (err.error?.formErrors?.[0] || JSON.stringify(err.error) || "Failed to generate AI suggestion."));

text = text.replace('setAiError(err.error || "Failed to generate AI suggestion.");', 'setAiError(typeof err.error === "string" ? err.error : (err.error?.formErrors?.[0] || JSON.stringify(err.error) || "Failed to generate AI suggestion."));')

with open("src/pages/CreateTask.tsx", "w") as f:
    f.write(text)

