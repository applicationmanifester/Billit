const fs = require('fs');

const filePath = "C:\\Users\\bharg_4mtuttl\\.gemini\\antigravity\ brain\\003cfc80-3c94-428c-873e-d1532aebdeb2\\browser\\scratchpad_99bkacs8.md";
const outputPath = "C:\\Users\\bharg_4mtuttl\\Desktop\\Google apps\\Billit\\src\\BillingApp_restored.jsx";

const lines = fs.readFileSync(filePath, 'utf8').split('\n');
let code = [];
let inBlock = false;

for (const line of lines) {
    if (line.trim().startsWith('```javascript')) {
        inBlock = true;
        continue;
    }
    if (line.trim() === '```' && inBlock) {
        inBlock = false;
        continue;
    }
    if (inBlock) {
        code.push(line);
    }
}

let result = code.join('\n');

// Cleanings
result = result.replace(/import { injectQuery as __vite__injectQuery }[\s\S]*?import { jsxDEV }.*?\n/, '');
result = result.replace(/import RefreshRuntime from "\/@react-refresh"[\s\S]*?const useEffect = __vite__cjsImport3_react\["useEffect"\];\n/, 'import React, { useState, useMemo, useEffect } from "react";\n');
result = result.replace(/\s+_s\(\);\n/g, '\n');
result = result.replace(/\s+_s\(BillingApp, ".*?"\);\n/g, '\n');
result = result.replace(/\s+_c = BillingApp;\n/g, '\n');
result = result.replace(/var _c;\n/g, '');
result = result.replace(/\$RefreshReg\$\(_c, "BillingApp"\);\n/g, '');
result = result.replace(/\/\* @__PURE__ \*\/ /g, '');
result = result.replace(/\/\/# sourceMappingURL=.*\n?/, '');

fs.writeFileSync(outputPath, result);
console.log("Extracted and sanitized code to BillingApp_restored.jsx");
