# Agent Prompt Fix - November 18, 2025 (FINAL: Short & Clear)

## Problem
The AI agent was **repeatedly** creating Handlebars templates with missing `{{braces}}` around placeholders, resulting in broken templates like:
```handlebars
{"value":,   "label":"Total Tables"}
         ↑ Missing {{value}}

{"value":,"trend":{"value":,}}
         ↑                ↑ Missing {{value}} and {{trend_value}}
```

## Root Cause
The prompt used the term "DIRECT field access" which was ambiguous:
- Intended meaning: "No `{{#each}}` wrapper needed for single-row queries"
- Misinterpreted as: "No braces needed at all"

This led the AI to omit the required `{{braces}}` syntax entirely.

**UPDATE**: Even after the first fix, the AI made the same error again, indicating the warning wasn't prominent enough.

## Fix Applied (v1 - INSUFFICIENT)
Initial fix added warnings but they weren't prominent enough.

## Fix Applied (v2 - NUCLEAR OPTION)
Made the warning **impossible to ignore** with multiple aggressive interventions:

### 1. Pre-Prompt Warning (ADDED AT VERY TOP)
```
⚠️⚠️⚠️ CRITICAL RULE - READ THIS BEFORE ANYTHING ELSE ⚠️⚠️⚠️
ALL HANDLEBARS TEMPLATES MUST USE {{DOUBLE_BRACES}} AROUND EVERY VARIABLE!
NEVER WRITE: {"value":,"label":"text"}
ALWAYS WRITE: {"value":{{value}},"label":"text"}
IF YOU FORGET THE {{BRACES}}, THE TEMPLATE WILL BE COMPLETELY BROKEN!
```
This appears BEFORE the main assistant description.

### 2. Pre-Flight Checklist Format
```
BEFORE YOU WRITE ANY TEMPLATE, CHECK THESE BOXES:
□ Every variable has {{double_braces}} around it
□ No bare field names like "value":, without {{braces}}
□ String values in quotes: "{{field}}"
□ Numeric values have braces but no quotes: {{field}}

✅ CORRECT: {"value":{{value}},"label":"Total","trend":{{trend}}}
❌ WRONG:   {"value":,"label":"Total","trend":}
             ↑↑↑ BROKEN - MISSING {{BRACES}} ↑↑↑
```

### 3. Visual Pattern Warnings
Added reminder in every pattern example:
```
**Stat-Card Template (NOTICE THE {{BRACES}} ON EVERY VARIABLE):**
```

### 4. Tool Descriptions (from v1)
- `create_component`: "CRITICAL HANDLEBARS RULE: ALL placeholders MUST use {{braces}}"
- `update_component`: "CRITICAL - ALL placeholders MUST use {{braces}}"
- Zod schema: Embedded critical warning

## Expected Impact (v2)
The warning now appears in **SEVEN** locations:
1. ⚠️ Pre-prompt header (FIRST thing the AI reads)
2. ⚠️ Checklist before templates section
3. ⚠️ Mandatory syntax rule with examples
4. ⚠️ Pattern quick reference reminder
5. ⚠️ `create_component` tool description
6. ⚠️ `create_component` Zod schema
7. ⚠️ `update_component` tool description

**Strategy**: Repetition + Visual Emphasis + Checklist Format = Impossible to Miss

## Verification
The AI should now ALWAYS generate templates like:
```handlebars
✅ CORRECT: {"value":{{value}},"trend":{"value":{{trend_value}},"direction":"{{direction}}"}}
❌ WRONG:   {"value":,"trend":{"value":,"direction":""}}
```

## If This STILL Fails
Consider:
1. The AI model may have a fundamental parsing issue with the instruction format
2. May need to add a pre-processing validation step in the tool itself
3. Consider rejecting templates that match the pattern `":\s*,` (colon followed by comma)
4. Add runtime template validation before sending to Handlebars engine

## Final Simplification (v3 - Short & Clear)
User requested to make prompts short and clear. Applied aggressive condensing:

**System Prompt:** 157 lines → 34 lines (78% reduction)
- Removed all redundancy
- Kept critical ⚠️ warning about {{braces}}
- Single-row and multi-row examples only
- List of available helpers
- Simple workflow steps

**Tool Descriptions:** Condensed from paragraph format to bullet points
- `create_component`: ~250 chars → ~180 chars
- `update_component`: ~280 chars → ~150 chars
- `handlebarsTemplate` Zod: ~350 chars → ~150 chars

**Result:** Clear, scannable, no fluff. Critical rule still prominent at top.

## Files Modified
- `/Users/Husam/Dev/dashboard-builder/agent-flow-Chart_Builder-2025-11-10.json`
  - System prompt: Complete rewrite (34 lines, was 157)
  - `create_component` tool description: Condensed
  - `create_component` Zod schema: Simplified
  - `update_component` tool description: Condensed
- `/Users/Husam/Dev/dashboard-builder/PROMPT_FIX_SUMMARY.md` (this file)
