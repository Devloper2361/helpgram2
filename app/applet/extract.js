const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

const project = new Project();
project.addSourceFilesAtPaths("src/**/*.{tsx,ts}");

const extracted = {};

const ignoreWords = ['if', 'else', 'function', 'const', 'return', 'import', 'export'];

function processFile(file) {
    if (file.getFilePath().includes('src/i18n') || file.getFilePath().includes('node_modules')) return;
    
    let hasChanges = false;
    
    file.getDescendantsOfKind(SyntaxKind.JsxText).forEach(node => {
        const text = node.getLiteralText().trim();
        if (text.length > 1 && !/^[{}$0-9\s]+$/.test(text)) {
            // Find a valid key
            const keyName = text.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15).toLowerCase();
            if (keyName.length > 2) {
                if (!extracted[keyName]) extracted[keyName] = text;
                node.replaceWithText(`{t("ui.${keyName}")}`);
                hasChanges = true;
            }
        }
    });
    
    if (hasChanges) {
        if (!file.getText().includes('useTranslation')) {
            file.addImportDeclaration({
                namedImports: ['useTranslation'],
                moduleSpecifier: '../i18n', // adjust relative path later if needed
            });
            // Try to find the default export function and add const { t } = useTranslation();
            const defaultExport = file.getDefaultExportSymbol();
            // This can be complex, let's keep it simple for manual fixing
        }
    }
}
// For MVP, just extracting the texts to build the en.ts might be safer and then string replacing.
