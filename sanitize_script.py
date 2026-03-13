import re

def sanitize_code(content):
    # Remove Vite specific imports and preamble
    content = re.sub(r'import { injectQuery as __vite__injectQuery }.*?import { jsxDEV }.*?\n', '', content, flags=re.DOTALL)
    content = re.sub(r'import RefreshRuntime from "/@react-refresh".*?const useEffect = __vite__cjsImport3_react\["useEffect"\];\n', 'import React, { useState, useMemo, useEffect } from "react";\n', content, flags=re.DOTALL)
    
    # Remove dev signal calls
    content = re.sub(r'\s+_s\(\);\n', '\n', content)
    content = re.sub(r'\s+_s\(BillingApp, ".*?"\);\n', '\n', content)
    content = re.sub(r'\s+_c = BillingApp;\n', '\n', content)
    content = re.sub(r'var _c;\n', '', content)
    content = re.sub(r'\$RefreshReg\$\(_c, "BillingApp"\);\n', '', content)
    
    # Remove pure annotations
    content = re.sub(r'/\* @__PURE__ \*/ ', '', content)
    
    # Remove source maps
    content = re.sub(r'//# sourceMappingURL=.*\n?', '', content)
    
    # Simple de-transpilation of jsxDEV to JSX is hard with regex for nested stuff.
    # However, Vite usually serves the code in a way that jsxDEV is used for dev.
    # Looking at the scratchpad, it seems to have a lot of jsxDEV calls.
    # Let's try to handle these systematically or see if we can just fix the common ones.
    
    # Actually, looking at the code, it uses a lot of jsxDEV.
    # A better approach might be to just clean up the obviously transpiled parts 
    # and then manually fix any remaining structural issues if they are small.
    # But for 2400 lines, manual is risky.
    
    # Let's try to convert jsxDEV calls: jsxDEV("tag", { props }, void 0, false, { ... }, this) -> <tag props>...</tag>
    # This is non-trivial for nested ones.
    
    return content

# Read the scratchpad
with open(r"C:\Users\bharg_4mtuttl\.gemini\antigravity\brain\003cfc80-3c94-428c-873e-d1532aebdeb2\browser\scratchpad_99bkacs8.md", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Extract code block
code = []
in_block = False
for line in lines:
    if line.strip().startswith("```javascript"):
        in_block = True
        continue
    if line.strip().startswith("```") and in_block:
        in_block = False
        continue
    if in_block:
        code.append(line)

full_code = "".join(code)
sanitized = sanitize_code(full_code)

with open(r"C:\Users\bharg_4mtuttl\Desktop\Google apps\Billit\src\BillingApp_restored.jsx", "w", encoding="utf-8") as f:
    f.write(sanitized)
