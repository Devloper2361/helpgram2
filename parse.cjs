const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(path.resolve(__dirname, 'src'));

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const sourceFile = ts.createSourceFile(file, content, 99, true, 4);
  
  // We want to find CallExpressions where the expression is an Identifier starting with "set"
  // And it is NOT inside an ArrowFunction, FunctionDeclaration, or FunctionExpression 
  // that is NOT the main component function.
  // Actually, a simpler heuristic: look for any CallExpression of `set...`
  // Then check its parent chain. If the first FunctionDeclaration/ArrowFunction it hits is the Component itself, it's a bug!
  
  function getNearestFunctionScope(node) {
     let curr = node.parent;
     while (curr) {
       if (ts.isFunctionDeclaration(curr) || ts.isArrowFunction(curr) || ts.isFunctionExpression(curr) || ts.isMethodDeclaration(curr)) {
         return curr;
       }
       curr = curr.parent;
     }
     return null;
  }
  
  function visit(node) {
    if (ts.isCallExpression(node)) {
       let name = "";
       if (ts.isIdentifier(node.expression)) {
         name = node.expression.text;
       }
       
       if (name.startsWith("set") && name !== "setTimeout" && name !== "setInterval") {
          const scope = getNearestFunctionScope(node);
          if (scope) {
             // Is this scope a React component? 
             // (Usually starts with uppercase, or returns JSX)
             let scopeName = "";
             if (ts.isFunctionDeclaration(scope) && scope.name) {
               scopeName = scope.name.text;
             } else if (ts.isArrowFunction(scope) && ts.isVariableDeclaration(scope.parent) && ts.isIdentifier(scope.parent.name)) {
               scopeName = scope.parent.name.text;
             }
             
             if (scopeName && /^[A-Z]/.test(scopeName)) {
                // If it's a component, then calling setState directly in it is bad!
                // Wait, it could be a nested function inside the component that also starts with uppercase? Unlikely.
                // Or what if the setState is inside a useEffect?
                // We need to check if there's any CallExpression (like useEffect, useCallback) between the setState and the Component.
                let isInsideHookOrHandler = false;
                let curr = node.parent;
                while (curr && curr !== scope) {
                   if (ts.isCallExpression(curr) || ts.isJsxExpression(curr) || ts.isJsxAttribute(curr)) {
                      isInsideHookOrHandler = true;
                      break;
                   }
                   curr = curr.parent;
                }
                
                if (!isInsideHookOrHandler) {
                   const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
                   console.log(`Infinite Loop Candidate: ${file}:${line} - ${name} called in ${scopeName}`);
                }
             }
          }
       }
    }
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
}
