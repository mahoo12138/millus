/**

 * millus - Standalone Browser & ESM Bundle

 * Auto-registers <ai-illustration> & <m-illus> CustomElements

 */

// --- src/schema/spec.ts ---
/**
 * @ai-illustrate/core - Schema & SceneGraph Type Definitions
 */

                          
             
             
               
            
             
             
            
           

                            
          
            
              
            
            

                                                           
                                                

                                    
                      
                           
                                   
                                                         
                   
                  
 

                            
                   
                  
                 
                 
               
                                     
                            
 

                               
                                 
                               
               
                   
                                                 
                                                         
 

                                  
              
                          
                           
                                                                         
             
             
                    
                        
                            
 

                                                          
                                                                         
                 
                    
                
 

                                                             
                  
                              
                 
                 
 

                                                          
               
            
                   
 

                                                          
               
               
                    
                                      
                                                       
                                            
                 
 

                                                          
               
               
                
                 
 

                                                           
                           
                 
                    
               
                
                          
 

                                                          
               
                
                    
                
                 
                
                           
 

                                                               
                     
                 
                
               
                            
 

                                   
                  
               
                  
                      
 

                                                              
                   
                 
                                          
 

                            
          
     
                   
                          
                     
      

                                                           
                
                 
                     
                           
 

                                                           
                
               
                
 

                                                             
                  
               
                  
                                             
 

                                      
               
                        
                 
                      
 

                                                              
                   
                 
                     
                                
 

                                    
             
                
                    
                      
 

                                      
               
             
                
                                    
                      
                
 

                                                              
                   
                 
                              
                                  
 

                         
                   
                      
                   
                   
                   
                    
                   
                        
                       
                    
                    
                      
                       
                        

                                          
                                                     
                                     
 

                                 
              
               
             
                 
                                                      
                                 
                                                             
                                                 
                       
                        
                
                                                     
                                                   
                      
                                              
                                            
                                                
 

                                   
                  
                 
            
                            
                             
                                                        
                                                             
                          
    
           
                         
                       
                                 
    
                          
                                 
 

// ============================================================================
// Scene Graph & Runtime Types
// ============================================================================

                              
            
            
                
                 
                       
                         
                             
 

                              
               
                 
                     
                     
 

                                      
                         
           
               
                    
                            
                   
                     
                 
                      
                   
                    
                                             
    
               
                     
                     
                         
    
             
                       
                        
                      
    
 

                                    
                     
                          
               
                 
                      
                           
                    
                         
                 
                                  
                  
                 
 

                                      
                   
            
            
                
                 
                      
                      
 

                                  
               
                 
                               
 

                                      
       
            
              
            
            
            
             
                 
                   
            
            
                 
                  
              
             
              
              
                
                             
                    
                
                  
                       
                           
                     
                      
                    
                               
                                          
                    
                   
 

                            
             
                            
            
            
                
                 
                           
        
            
              
               
               
                
             
               
            
             
                                     
                 
                 
                     
                                              
    
                                     
                                    
                        
 

                            
             
               
             
                      
                    
                
                             
                 
              
              
              
                  
                   
    
                     
                 
                      
                           
                                                    
                                                  
              
                                                      
                        
    
 

                                      
                       
                         
                       
 

                             
                 
                
                 
                                            
                                                          
                      
                             
                                              
                     
                     
                                                 
 

// ============================================================================
// Zero-Dependency Loose JSON & YAML Spec Parser + Semantic Validator
// ============================================================================

const VALID_ELEMENT_TYPES = new Set        ([
  "rect",
  "diamond",
  "circle",
  "ellipse",
  "cylinder",
  "queue",
  "polygon",
  "path",
  "text",
  "icon",
  "group",
  "window",
  "card",
  "code-block",
  "terminal",
  "table",
  "badge",
  "callout",
  "bitfield",
  "sequence",
]);

/**
 * Normalizes loose LLM-generated JSON (strips // and /* comments, single quotes,
 * unquoted object keys, and trailing commas) into strict JSON.
 */
export function normalizeLooseJson(raw        )         {
  let out = "";
  let i = 0;
  const n = raw.length;
  let inDouble = false;
  let inSingle = false;

  while (i < n) {
    const ch = raw[i];
    const next = raw[i + 1];

    if (inDouble) {
      if (ch === "\\" && i + 1 < n) {
        out += ch + raw[i + 1];
        i += 2;
        continue;
      }
      if (ch === '"') {
        inDouble = false;
        out += ch;
        i++;
        continue;
      }
      if (ch === "\n") {
        out += "\\n";
        i++;
        continue;
      }
      if (ch === "\r") {
        i++;
        continue;
      }
      out += ch;
      i++;
      continue;
    }

    if (inSingle) {
      if (ch === "\\" && i + 1 < n) {
        const esc = raw[i + 1];
        if (esc === "'") {
          out += "'";
        } else {
          out += "\\" + esc;
        }
        i += 2;
        continue;
      }
      if (ch === "'") {
        inSingle = false;
        out += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        out += '\\"';
        i++;
        continue;
      }
      if (ch === "\n") {
        out += "\\n";
        i++;
        continue;
      }
      if (ch === "\r") {
        i++;
        continue;
      }
      out += ch;
      i++;
      continue;
    }

    // Outside strings: check comments
    if (ch === "/" && next === "/") {
      i += 2;
      while (i < n && raw[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < n && !(raw[i] === "*" && raw[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    if (ch === '"') {
      inDouble = true;
      out += ch;
      i++;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      out += '"';
      i++;
      continue;
    }

    out += ch;
    i++;
  }

  // Quote unquoted object keys: { key: ... or , key: ...
  const withQuotedKeys = out.replace(
    /([{,]\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*:)/g,
    '$1"$2"$3'
  );

  // Strip trailing commas before } or ]
  return withQuotedKeys.replace(/,(\s*[}\]])/g, "$1");
}

function stripInlineYamlComment(raw        )         {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "\\" && (inSingle || inDouble)) {
      i++;
      continue;
    }
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === "#" && !inSingle && !inDouble) {
      if (i === 0 || /\s/.test(raw[i - 1])) {
        return raw.slice(0, i).trimEnd();
      }
    }
  }
  return raw.trimEnd();
}

function parseYamlScalar(raw        )          {
  const s = raw.trim();
  if (!s) return "";
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "null" || s === "~") return null;
  if (/^-?\d+(?:\.\d+)?$/.test(s)) {
    return Number(s);
  }
  if (
    (s.startsWith("[") && s.endsWith("]")) ||
    (s.startsWith("{") && s.endsWith("}"))
  ) {
    try {
      return JSON.parse(normalizeLooseJson(s));
    } catch {
      // Fallback to string if not valid flow collection
    }
  }
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    try {
      return JSON.parse(normalizeLooseJson(s));
    } catch {
      return s.slice(1, -1);
    }
  }
  return s;
}

function splitYamlKeyValue(text        )                          {
  let inSingle = false;
  let inDouble = false;
  let bracketDepth = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\\" && (inSingle || inDouble)) {
      i++;
      continue;
    }
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (!inSingle && !inDouble) {
      if (ch === "[" || ch === "{") bracketDepth++;
      else if (ch === "]" || ch === "}") bracketDepth = Math.max(0, bracketDepth - 1);
      else if (
        ch === ":" &&
        bracketDepth === 0 &&
        (i + 1 === text.length || /\s/.test(text[i + 1]))
      ) {
        const key = text
          .slice(0, i)
          .trim()
          .replace(/^['"]|['"]$/g, "");
        const val = text.slice(i + 1).trim();
        return [key, val];
      }
    }
  }
  return null;
}

                    
                 
               
                  
 

function parseYamlSubset(raw        )          {
  const rawLines = raw.split(/\r?\n/);
  const lines             = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmedStart = line.trimStart();
    if (!trimmedStart || trimmedStart.startsWith("#")) {
      lines.push({ indent: -1, text: "", rawText: line });
      continue;
    }
    const indent = line.length - trimmedStart.length;
    const cleaned = stripInlineYamlComment(trimmedStart);
    lines.push({ indent, text: cleaned, rawText: line });
  }

  const nextNonEmpty = (startIdx        )         => {
    let idx = startIdx;
    while (idx < lines.length && lines[idx].indent === -1) idx++;
    return idx;
  };

  const parseBlockScalar = (
    startIdx        ,
    parentIndent        ,
    folded         
  )                                     => {
    const collected           = [];
    let idx = startIdx;
    let blockIndent = -1;

    while (idx < lines.length) {
      const l = lines[idx];
      if (l.indent === -1) {
        if (blockIndent !== -1) collected.push("");
        idx++;
        continue;
      }
      if (l.indent <= parentIndent) break;
      if (blockIndent === -1) blockIndent = l.indent;
      collected.push(l.rawText.slice(Math.min(l.rawText.length, blockIndent)));
      idx++;
    }

    while (collected.length > 0 && collected[collected.length - 1] === "") {
      collected.pop();
    }
    return {
      value: folded ? collected.join(" ") : collected.join("\n"),
      nextIdx: idx,
    };
  };

  const parseNode = (
    startIdx        ,
    minIndent        
  )                                      => {
    const firstIdx = nextNonEmpty(startIdx);
    if (firstIdx >= lines.length || lines[firstIdx].indent < minIndent) {
      return { value: {}, nextIdx: firstIdx };
    }

    const baseIndent = lines[firstIdx].indent;
    const isSeq =
      lines[firstIdx].text === "-" || lines[firstIdx].text.startsWith("- ");

    if (isSeq) {
      const arr            = [];
      let idx = firstIdx;

      while (idx < lines.length) {
        idx = nextNonEmpty(idx);
        if (idx >= lines.length || lines[idx].indent < baseIndent) break;
        if (lines[idx].indent > baseIndent) break;
        const l = lines[idx];
        if (!(l.text === "-" || l.text.startsWith("- "))) break;

        const afterDash = l.text.slice(1).trim();
        if (!afterDash) {
          const sub = parseNode(idx + 1, baseIndent + 1);
          arr.push(sub.value);
          idx = sub.nextIdx;
          continue;
        }

        const kv = splitYamlKeyValue(afterDash);
        if (kv) {
          const itemObj                          = {};
          const [k, v] = kv;
          idx++;
          if (v === "|" || v === "|-" || v === ">" || v === ">-") {
            const blk = parseBlockScalar(idx, baseIndent + 1, v.startsWith(">"));
            itemObj[k] = blk.value;
            idx = blk.nextIdx;
          } else if (v === "") {
            const sub = parseNode(idx, baseIndent + 2);
            itemObj[k] = sub.value;
            idx = sub.nextIdx;
          } else {
            itemObj[k] = parseYamlScalar(v);
          }

          // Check if additional properties follow at deeper indentation
          const nextIdx = nextNonEmpty(idx);
          if (nextIdx < lines.length && lines[nextIdx].indent > baseIndent) {
            const rest = parseObjectProps(
              nextIdx,
              lines[nextIdx].indent,
              itemObj
            );
            idx = rest;
          }
          arr.push(itemObj);
        } else {
          arr.push(parseYamlScalar(afterDash));
          idx++;
        }
      }

      return { value: arr, nextIdx: idx };
    }

    const obj                          = {};
    const nextIdx = parseObjectProps(firstIdx, baseIndent, obj);
    return { value: obj, nextIdx };
  };

  const parseObjectProps = (
    startIdx        ,
    baseIndent        ,
    target                         
  )         => {
    let idx = startIdx;
    while (idx < lines.length) {
      idx = nextNonEmpty(idx);
      if (idx >= lines.length || lines[idx].indent < baseIndent) break;
      if (lines[idx].indent > baseIndent) break;
      const l = lines[idx];
      if (l.text === "-" || l.text.startsWith("- ")) break;

      const kv = splitYamlKeyValue(l.text);
      if (!kv) {
        idx++;
        continue;
      }

      const [key, val] = kv;
      idx++;
      if (val === "|" || val === "|-" || val === ">" || val === ">-") {
        const blk = parseBlockScalar(idx, baseIndent, val.startsWith(">"));
        target[key] = blk.value;
        idx = blk.nextIdx;
      } else if (val === "") {
        const sub = parseNode(idx, baseIndent + 1);
        target[key] = sub.value;
        idx = sub.nextIdx;
      } else {
        target[key] = parseYamlScalar(val);
      }
    }
    return idx;
  };

  return parseNode(0, 0).value;
}

/**
 * Parses an IllustrationSpec string in strict JSON, loose JSON (with comments / trailing commas /
 * single quotes / unquoted keys), or YAML format.
 */
export function parseIllustrationSpecText(raw        )          {
  let trimmed = (raw || "").trim();
  if (!trimmed) {
    throw new Error("Empty illustration spec.");
  }

  // Strip surrounding markdown code fences if present
  if (trimmed.startsWith("```")) {
    const lines = trimmed.split(/\r?\n/);
    if (lines.length >= 2 && lines[lines.length - 1].trim().startsWith("```")) {
      trimmed = lines.slice(1, -1).join("\n").trim();
    }
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return JSON.parse(normalizeLooseJson(trimmed));
    }
  }

  return parseYamlSubset(trimmed);
}

function editDistance(a        , b        )         {
  const m = a.length;
  const n = b.length;
  const dp             = Array.from({ length: m + 1 }, () =>
    new Array        (n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function suggestClosestId(
  target        ,
  candidates                  
)                     {
  let best                    ;
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = editDistance(target, c);
    if (d < bestDist && d <= Math.max(3, Math.ceil(target.length * 0.5))) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

/**
 * Runtime semantic validator with descriptive errors & fuzzy ID suggestions for LLM self-repair
 */
export function validateIllustrationSpec(input         )   
                 
                   
                          
  {
  const errors           = [];
  let parsedInput = input;

  if (typeof input === "string") {
    try {
      parsedInput = parseIllustrationSpecText(input);
    } catch (err) {
      return {
        valid: false,
        errors: [`Failed to parse spec text: ${(err         ).message}`],
      };
    }
  }

  if (!parsedInput || typeof parsedInput !== "object") {
    return { valid: false, errors: ["Root spec must be a JSON/YAML object."] };
  }

  const obj = parsedInput                           ;
  const knownNodeIds = new Set        ();

  const validateElementTree = (
    elements           ,
    pathPrefix        
  )       => {
    const siblingIds = new Set        ();

    elements.forEach((el, idx) => {
      const itemPath = `${pathPrefix}[${idx}]`;
      if (!el || typeof el !== "object") {
        errors.push(`${itemPath} must be an object.`);
        return;
      }
      const typed = el                           ;
      if (typeof typed.type !== "string") {
        errors.push(`${itemPath} is missing a 'type' property.`);
        return;
      }
      if (!VALID_ELEMENT_TYPES.has(typed.type)) {
        errors.push(
          `${itemPath} has unknown type "${typed.type}". Valid types: ${Array.from(VALID_ELEMENT_TYPES).join(", ")}.`
        );
      }
      if (typeof typed.id === "string" && typed.id.trim()) {
        const id = typed.id.trim();
        if (knownNodeIds.has(id)) {
          errors.push(`${itemPath} has duplicate element id "${id}".`);
        }
        knownNodeIds.add(id);
        siblingIds.add(id);
      }
      if (Array.isArray(typed.children)) {
        validateElementTree(typed.children, `${itemPath}.children`);
      }
    });

    // Check sibling relative `place` references within this container
    if (siblingIds.size > 0) {
      elements.forEach((el, idx) => {
        if (!el || typeof el !== "object") return;
        const typed = el                           ;
        const selfId = typeof typed.id === "string" ? typed.id.trim() : undefined;
        const place = typed.place                                       ;
        if (!place || typeof place !== "object") return;

        for (const dirKey of ["rightOf", "leftOf", "below", "above"]         ) {
          const refVal = place[dirKey];
          if (typeof refVal === "string" && refVal.trim()) {
            const refId = refVal.trim();
            if (selfId && refId === selfId) {
              errors.push(
                `${pathPrefix}[${idx}].place.${dirKey} cannot reference itself ("${selfId}").`
              );
            } else if (!siblingIds.has(refId)) {
              const suggestion = suggestClosestId(refId, siblingIds);
              const hint = suggestion ? ` Did you mean "${suggestion}"?` : "";
              errors.push(
                `${pathPrefix}[${idx}].place.${dirKey} references unknown sibling id "${refId}".${hint}`
              );
            }
          }
        }
      });
    }
  };

  if (!Array.isArray(obj.elements)) {
    errors.push("Missing or invalid 'elements' array at root.");
  } else {
    validateElementTree(obj.elements, "elements");

    // Check callout target references
    if (knownNodeIds.size > 0) {
      obj.elements.forEach((el, idx) => {
        if (!el || typeof el !== "object") return;
        const typed = el                           ;
        if (
          typed.type === "callout" &&
          typeof typed.target === "string" &&
          typed.target.trim()
        ) {
          const baseTarget = typed.target.split("@")[0].split(".")[0].trim();
          if (!knownNodeIds.has(baseTarget)) {
            const suggestion = suggestClosestId(baseTarget, knownNodeIds);
            const hint = suggestion ? ` Did you mean "${suggestion}"?` : "";
            errors.push(
              `elements[${idx}].target references unknown element id "${baseTarget}".${hint}`
            );
          }
        }
      });
    }
  }

  if (obj.connections !== undefined) {
    if (!Array.isArray(obj.connections)) {
      errors.push("'connections' must be an array when provided.");
    } else if (knownNodeIds.size > 0) {
      obj.connections.forEach((conn, idx) => {
        if (!conn || typeof conn !== "object") {
          errors.push(`connections[${idx}] must be an object.`);
          return;
        }
        const typed = conn                           ;
        for (const endKey of ["from", "to"]         ) {
          const rawEnd = typed[endKey];
          if (typeof rawEnd !== "string" || !rawEnd.trim()) {
            errors.push(
              `connections[${idx}] is missing a valid '${endKey}' endpoint string.`
            );
            continue;
          }
          const baseId = rawEnd.split("@")[0].split(".")[0].trim();
          if (!knownNodeIds.has(baseId)) {
            const suggestion = suggestClosestId(baseId, knownNodeIds);
            const hint = suggestion ? ` Did you mean "${suggestion}"?` : "";
            errors.push(
              `connections[${idx}].${endKey} ("${rawEnd}") references unknown element id "${baseId}".${hint}`
            );
          }
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    spec:
      errors.length === 0
        ? (parsedInput                               )
        : undefined,
  };
}

// --- src/schema/ai-prompt.ts ---
/**
 * AI System Prompt & Structured Output Schema Generator
 */

export const AI_ILLUSTRATION_SYSTEM_PROMPT = `You are a technical illustration architect for an MDX blog.
Instead of writing raw SVG or Mermaid, output a structured JSON (or YAML) block inside \`\`\`illustration ... \`\`\` following the IllustrationSpec schema.

### Core Rules
1. **Never hardcode hex colors**: Always use semantic tones (\`"primary" | "secondary" | "accent" | "success" | "warning" | "danger" | "info" | "neutral"\`) and variants (\`"soft" | "filled" | "outlined" | "dashed" | "ghost"\`). The runtime automatically adapts them to the blog's Light/Dark CSS variables.
2. **Avoid manual pixel math**:
   - Inside \`group\` or \`window\`, use \`layout: { type: "flex", direction: "row" | "column", gap: 16 }\`.
   - Between top-level siblings, use relative placement: \`place: { rightOf: "node_id", gap: 48, align: "center" }\` or \`below: "node_id"\`.
   - Only use explicit \`x, y\` coordinates for free-form geometric canvas drawings.
3. **Use compound technical primitives**:
   - \`card\`: Title, optional icon (\`cpu\`, \`layers\`, \`database\`, \`cloud\`, \`lock\`, \`sparkles\`, \`terminal\`, \`code\`, \`server\`, \`globe\`, \`zap\`, \`shield\`, \`check\`, \`git\`, \`key\`, \`box\`, \`activity\`, \`hard-drive\`, \`wifi\`, \`sliders\`, \`send\`), badge, and body text.
   - \`code-block\`: Displays syntax-highlighted code with \`highlightLines: [2, 3]\`. Each 1-indexed line exposes an anchor \`<id>.line_<n>\` (e.g. \`from: "code1.line_2@right"\`).
   - \`table\`: Memory layout, struct fields, or cache tables. Each cell exposes an anchor \`<id>.cell_<row>_<col>\`.
   - \`bitfield\`: Network packet headers, CPU registers, or memory bit layouts (\`title\`, \`totalBits\`, \`fields: [{ name, bits, value, tone }]\`). Each field exposes an anchor \`<id>.field_<idx>\`.
   - \`sequence\`: Protocol handshakes and RPC lifelines (\`title\`, \`actors: [{ id, label, sublabel, tone }]\`, \`messages: [{ from, to, label, type: "sync" | "async" | "reply", tone }]\`).
   - \`cylinder\` & \`queue\`: 3D storage database cylinder and horizontal message queue pipe (\`label\`, \`sublabel\`, \`style\`).
   - \`terminal\`: CLI commands and outputs. Each 1-indexed line exposes an anchor \`<id>.line_<n>\`.
   - \`callout\`: Floating annotation pointing to \`target: "<node_or_subanchor_id>"\`.
4. **Connections, Labels & Animation**:
   - Connect any node or sub-anchor using \`from: "nodeA@right"\`, \`to: "nodeB@left"\` (or with explicit port ratio \`"nodeA@right:30%"\`).
   - Set \`routing: "orthogonal" | "curved" | "straight"\`.
   - Fine-tune edge labels with \`label\`, \`labelPosition: "start" | "center" | "end" | 0.5\`, \`labelSide: "center" | "top" | "bottom" | "left" | "right"\`, and \`labelOffset: [dx, dy]\`.
   - Add \`animation: { type: "flow" | "pulse" | "bidirectional", speed: "normal" }\` for active data/request paths.
`;

export function getIllustrationJsonSchema()                          {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "IllustrationSpec",
    type: "object",
    required: ["elements"],
    properties: {
      title: { type: "string" },
      canvas: {
        type: "object",
        properties: {
          padding: { type: "number" },
          background: { enum: ["transparent", "surface", "dots", "grid"] },
        },
      },
      style: {
        type: "object",
        properties: {
          preset: { enum: ["clean", "sketch", "blueprint"] },
        },
      },
      elements: {
        type: "array",
        items: { type: "object" },
      },
      connections: {
        type: "array",
        items: {
          type: "object",
          required: ["from", "to"],
          properties: {
            from: { type: "string" },
            to: { type: "string" },
            label: { type: "string" },
            labelPosition: {
              type: ["number", "string"],
              enum: ["start", "center", "end", 0.25, 0.5, 0.75],
            },
            labelSide: {
              enum: ["center", "top", "bottom", "left", "right"],
            },
            labelOffset: {
              type: "array",
              items: { type: "number" },
              minItems: 2,
              maxItems: 2,
            },
            routing: { enum: ["orthogonal", "curved", "straight"] },
            tone: {
              enum: [
                "neutral",
                "primary",
                "secondary",
                "accent",
                "success",
                "warning",
                "danger",
                "info",
              ],
            },
            strokeStyle: { enum: ["solid", "dashed", "dotted"] },
            animation: {
              type: ["boolean", "object"],
            },
          },
        },
      },
    },
  };
}

// --- src/runtime/theme-observer.ts ---
/**
 * Runtime Theme Observer & Multi-Blog CSS Variable Resolver
 * Automatically inherits CSS variables from custom blogs, VitePress, Astro Starlight, Docusaurus, or Tailwind.
 */

             
              
                    
                      
                    
               
                 
                           

               
            
            
            
 

function parseAngleDegrees(raw        )         {
  const s = raw.trim().toLowerCase();
  const val = parseFloat(s);
  if (Number.isNaN(val)) return 0;
  if (s.endsWith("turn")) return val * 360;
  if (s.endsWith("rad")) return (val * 180) / Math.PI;
  if (s.endsWith("grad")) return val * 0.9;
  return val;
}

function hslToRgb(hDeg        , sPct        , lPct        )      {
  const h = (((hDeg % 360) + 360) % 360) / 360;
  const s = Math.max(0, Math.min(1, sPct / 100));
  const l = Math.max(0, Math.min(1, lPct / 100));

  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }

  const hue2rgb = (p        , q        , t        )         => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

function oklchToRgb(lVal        , cVal        , hDeg        )      {
  const L = Math.max(0, Math.min(1, lVal));
  const C = Math.max(0, cVal);
  const hRad = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const toSrgb = (x        )         => {
    const clamped = Math.max(0, Math.min(1, x));
    const gamma =
      clamped <= 0.0031308
        ? 12.92 * clamped
        : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
    return Math.round(gamma * 255);
  };

  return {
    r: toSrgb(rLin),
    g: toSrgb(gLin),
    b: toSrgb(bLin),
  };
}

export function parseColorToRgb(input        , fallback     )      {
  const trimmed = input.trim();
  if (!trimmed) return fallback;

  // 1. Hex (#rgb, #rgba, #rrggbb, #rrggbbaa)
  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    if (hex.length >= 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  // 2. rgb() or rgba() — supports comma-separated and modern CSS Color 4 space-separated syntax
  const rgbFunc = trimmed.match(/^rgba?\(\s*([^)]+)\s*\)$/i);
  if (rgbFunc) {
    const body = rgbFunc[1].split("/")[0].trim();
    const parts = body.includes(",")
      ? body.split(",").map((s) => s.trim())
      : body.split(/\s+/);
    if (parts.length >= 3) {
      const parseChannel = (raw        )         => {
        if (raw.endsWith("%")) {
          return Math.round((parseFloat(raw) / 100) * 255);
        }
        return Math.round(parseFloat(raw));
      };
      const r = parseChannel(parts[0]);
      const g = parseChannel(parts[1]);
      const b = parseChannel(parts[2]);
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
        return {
          r: Math.max(0, Math.min(255, r)),
          g: Math.max(0, Math.min(255, g)),
          b: Math.max(0, Math.min(255, b)),
        };
      }
    }
  }

  // 3. hsl() or hsla() — comma or space-separated
  const hslFunc = trimmed.match(/^hsla?\(\s*([^)]+)\s*\)$/i);
  if (hslFunc) {
    const body = hslFunc[1].split("/")[0].trim();
    const parts = body.includes(",")
      ? body.split(",").map((s) => s.trim())
      : body.split(/\s+/);
    if (parts.length >= 3) {
      const h = parseAngleDegrees(parts[0]);
      const s = parseFloat(parts[1]);
      const l = parseFloat(parts[2]);
      if (!Number.isNaN(s) && !Number.isNaN(l)) {
        return hslToRgb(h, s, l);
      }
    }
  }

  // 4. oklch(L C H [/ A]) — Tailwind v4 / modern design systems
  const oklchFunc = trimmed.match(/^oklch\(\s*([^)]+)\s*\)$/i);
  if (oklchFunc) {
    const body = oklchFunc[1].split("/")[0].trim();
    const parts = body.includes(",")
      ? body.split(",").map((s) => s.trim())
      : body.split(/\s+/);
    if (parts.length >= 3) {
      const rawL = parts[0];
      const l = rawL.endsWith("%")
        ? parseFloat(rawL) / 100
        : parseFloat(rawL);
      const c = parseFloat(parts[1]);
      const h = parseAngleDegrees(parts[2]);
      if (!Number.isNaN(l) && !Number.isNaN(c)) {
        return oklchToRgb(l, c, h);
      }
    }
  }

  return fallback;
}

export function rgbToHex({ r, g, b }     )         {
  const clamp = (n        ) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Mix colorA into colorB by weight (0..1 of colorA)
 */
export function mixColors(colorA        , colorB        , weightA        )         {
  const a = parseColorToRgb(colorA, { r: 59, g: 130, b: 246 });
  const b = parseColorToRgb(colorB, { r: 255, g: 255, b: 255 });
  const w = Math.max(0, Math.min(1, weightA));
  return rgbToHex({
    r: a.r * w + b.r * (1 - w),
    g: a.g * w + b.g * (1 - w),
    b: a.b * w + b.b * (1 - w),
  });
}

export function getRelativeLuminance(color        )         {
  const { r, g, b } = parseColorToRgb(color, { r: 255, g: 255, b: 255 });
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

const DEFAULT_LIGHT_TONES                               = {
  neutral: "#64748b",
  primary: "#3b82f6",
  secondary: "#8b5cf6",
  accent: "#06b6d4",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#0ea5e9",
};

const DEFAULT_DARK_TONES                               = {
  neutral: "#94a3b8",
  primary: "#60a5fa",
  secondary: "#a78bfa",
  accent: "#22d3ee",
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#f87171",
  info: "#38bdf8",
};

function readFirstCssVar(
  styles                       ,
  names          
)                     {
  for (const name of names) {
    for (const style of styles) {
      const val = style.getPropertyValue(name)?.trim();
      if (val && val !== "initial" && val !== "inherit") {
        return val;
      }
    }
  }
  return undefined;
}

export function resolveThemeTokens(
  hostElement                     ,
  overridePreset              ,
  overrideRoughness         
)                      {
  const isBrowser =
    typeof window !== "undefined" && typeof document !== "undefined";

  const styles                        = [];
  if (isBrowser) {
    if (hostElement) styles.push(window.getComputedStyle(hostElement));
    if (document.body) styles.push(window.getComputedStyle(document.body));
    styles.push(window.getComputedStyle(document.documentElement));
  }

  // Detect dark mode from class, attribute, CSS variable, or background luminance
  let isDark = false;
  if (isBrowser) {
    const root = document.documentElement;
    const body = document.body;
    const themeAttr =
      hostElement?.getAttribute("data-theme") ||
      root.getAttribute("data-theme") ||
      body?.getAttribute("data-theme") ||
      root.getAttribute("data-color-mode");

    if (themeAttr === "dark") {
      isDark = true;
    } else if (themeAttr === "light") {
      isDark = false;
    } else if (
      root.classList.contains("dark") ||
      body?.classList.contains("dark") ||
      hostElement?.classList.contains("dark")
    ) {
      isDark = true;
    } else {
      const rawBg = readFirstCssVar(styles, [
        "--ill-bg",
        "--blog-bg",
        "--vp-c-bg",
        "--sl-color-bg",
      ]);
      if (rawBg) {
        isDark = getRelativeLuminance(rawBg) < 0.45;
      }
    }
  }

  const cssPreset = readFirstCssVar(styles, ["--ill-preset"])   
                 
               ;
  const activePreset              = overridePreset || cssPreset || "clean";
  const isBlueprint = activePreset === "blueprint";

  const mode                   = isDark ? "dark" : "light";
  const defaultBg = isDark ? "#0b0f19" : "#ffffff";
  const defaultSurface = isDark ? "#131b2e" : "#f8fafc";
  const defaultSurfaceElevated = isDark ? "#1a243b" : "#ffffff";
  const defaultCodeBg = isDark ? "#080c14" : "#0f172a";
  const defaultCodeText = "#e2e8f0";
  const defaultText = isDark ? "#f1f5f9" : "#0f172a";
  const defaultTextMuted = isDark ? "#94a3b8" : "#64748b";
  const defaultBorder = isDark ? "#2a364f" : "#cbd5e1";

  const rawBgColor =
    readFirstCssVar(styles, [
      "--ill-bg",
      "--blog-bg",
      "--vp-c-bg",
      "--sl-color-bg",
    ]) || defaultBg;
  const bg = isBlueprint
    ? mixColors(isDark ? "#082046" : "#e0f2fe", rawBgColor, 0.42)
    : rawBgColor;

  const surface =
    readFirstCssVar(styles, [
      "--ill-surface",
      "--blog-card-bg",
      "--vp-c-bg-soft",
      "--sl-color-bg-nav",
    ]) || defaultSurface;

  const text =
    readFirstCssVar(styles, [
      "--ill-text",
      "--blog-fg",
      "--vp-c-text-1",
      "--sl-color-text",
    ]) || defaultText;

  const textMuted =
    readFirstCssVar(styles, [
      "--ill-text-muted",
      "--blog-fg-muted",
      "--vp-c-text-2",
    ]) || defaultTextMuted;

  const border =
    readFirstCssVar(styles, [
      "--ill-border",
      "--blog-border",
      "--vp-c-divider",
      "--sl-color-hairline",
    ]) || defaultBorder;

  const baseToneDefaults = isDark ? DEFAULT_DARK_TONES : DEFAULT_LIGHT_TONES;
  const tones = {}                                          ;

  const toneVarMap                                 = {
    neutral: ["--ill-neutral", "--blog-neutral"],
    primary: [
      "--ill-primary",
      "--blog-primary",
      "--vp-c-brand-1",
      "--sl-color-accent",
    ],
    secondary: ["--ill-secondary", "--blog-secondary", "--vp-c-purple-1"],
    accent: ["--ill-accent", "--blog-accent", "--vp-c-indigo-1"],
    success: ["--ill-success", "--blog-success", "--vp-c-green-1"],
    warning: ["--ill-warning", "--blog-warning", "--vp-c-yellow-1"],
    danger: ["--ill-danger", "--blog-danger", "--vp-c-red-1"],
    info: ["--ill-info", "--blog-info"],
  };

  (Object.keys(baseToneDefaults)                  ).forEach((tone) => {
    const rawMain =
      readFirstCssVar(styles, toneVarMap[tone]) || baseToneDefaults[tone];
    const main = rgbToHex(
      parseColorToRgb(rawMain, parseColorToRgb(baseToneDefaults[tone], { r: 59, g: 130, b: 246 }))
    );
    const softWeight = isBlueprint ? (isDark ? 0.2 : 0.14) : isDark ? 0.16 : 0.11;
    const borderWeight = isBlueprint ? (isDark ? 0.68 : 0.58) : isDark ? 0.55 : 0.45;
    tones[tone] = {
      main,
      softBg: mixColors(main, bg, softWeight),
      softBorder: mixColors(main, bg, borderWeight),
      filledText: getRelativeLuminance(main) > 0.62 ? "#0f172a" : "#ffffff",
    };
  });

  const fontSans =
    readFirstCssVar(styles, [
      "--ill-font-sans",
      "--blog-font-sans",
      "--vp-font-family-base",
    ]) ||
    'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const fontMono =
    readFirstCssVar(styles, [
      "--ill-font-mono",
      "--blog-font-mono",
      "--vp-font-family-mono",
    ]) ||
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

  return {
    mode,
    colors: {
      bg,
      surface: mixColors(surface, bg, 0.85),
      surfaceElevated: isBlueprint
        ? mixColors(isDark ? "#0c2b59" : "#f0f9ff", defaultSurfaceElevated, 0.5)
        : defaultSurfaceElevated,
      codeBg: defaultCodeBg,
      codeText: defaultCodeText,
      text,
      textMuted,
      border,
      gridDot: isBlueprint
        ? mixColors(tones.info.main, bg, isDark ? 0.26 : 0.22)
        : mixColors(textMuted, bg, isDark ? 0.25 : 0.22),
      tones,
    },
    typography: {
      fontSans: isBlueprint ? fontMono : fontSans,
      fontMono,
      baseFontSize: 13,
    },
    geometry: {
      baseRadius: isBlueprint ? 3 : 10,
      preset: activePreset,
      roughness: overrideRoughness ?? 1.25,
    },
  };
}

export function resolveNodeStyle(
  specStyle                               ,
  theme                     ,
  defaultVariant                 = "soft",
  defaultTone               = "neutral"
)                    {
  const tone = specStyle?.tone || defaultTone;
  const variant = specStyle?.variant || defaultVariant;
  const palette = theme.colors.tones[tone] || theme.colors.tones.neutral;

  let fill = palette.softBg;
  let stroke = palette.softBorder;
  let strokeWidth = 1.5;
  let strokeDasharray                    ;
  let textColor = theme.colors.text;
  let mutedTextColor = theme.colors.textMuted;

  switch (variant) {
    case "filled":
      fill = palette.main;
      stroke = mixColors(palette.main, "#000000", 0.85);
      textColor = palette.filledText;
      mutedTextColor = mixColors(palette.filledText, palette.main, 0.78);
      break;
    case "outlined":
      fill = theme.colors.surfaceElevated;
      stroke = tone === "neutral" ? theme.colors.border : palette.softBorder;
      break;
    case "dashed":
      fill = mixColors(palette.main, theme.colors.bg, 0.05);
      stroke = palette.softBorder;
      strokeDasharray = "6 4";
      break;
    case "ghost":
      fill = "transparent";
      stroke = "transparent";
      strokeWidth = 0;
      break;
    case "soft":
    default:
      if (tone === "neutral") {
        fill = theme.colors.surface;
        stroke = theme.colors.border;
      } else {
        fill = palette.softBg;
        stroke = palette.softBorder;
      }
      break;
  }

  let radius = theme.geometry.baseRadius;
  if (typeof specStyle?.radius === "number") {
    radius = specStyle.radius;
  } else if (specStyle?.radius === "none") {
    radius = 0;
  } else if (specStyle?.radius === "sm") {
    radius = 6;
  } else if (specStyle?.radius === "lg") {
    radius = 14;
  } else if (specStyle?.radius === "full") {
    radius = 999;
  }

  return {
    tone,
    variant,
    fill,
    stroke,
    strokeWidth,
    strokeDasharray,
    textColor,
    mutedTextColor,
    radius,
    elevation: specStyle?.elevation || "none",
    opacity: specStyle?.opacity ?? 1,
    rough: specStyle?.rough ?? theme.geometry.preset === "sketch",
  };
}

/**
 * Watches document & host element for any theme / class / CSS variable changes
 */
export class ThemeObserver {
          mutationObserver                   ;
          mediaQuery                 ;
          onMediaChange             ;
          hostElement             ;
          onThemeChange            ;

  constructor(
    hostElement             ,
    onThemeChange            
  ) {
    this.hostElement = hostElement;
    this.onThemeChange = onThemeChange;
  }

  connect()       {
    if (typeof window === "undefined" || typeof MutationObserver === "undefined") {
      return;
    }

    let rafId                = null;
    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        this.onThemeChange();
      });
    };

    this.mutationObserver = new MutationObserver(scheduleUpdate);
    const observeConfig                       = {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-color-mode", "style"],
    };

    this.mutationObserver.observe(document.documentElement, observeConfig);
    if (document.body) {
      this.mutationObserver.observe(document.body, observeConfig);
    }
    this.mutationObserver.observe(this.hostElement, observeConfig);

    if (window.matchMedia) {
      this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      this.onMediaChange = scheduleUpdate;
      this.mediaQuery.addEventListener("change", this.onMediaChange);
    }
  }

  disconnect()       {
    this.mutationObserver?.disconnect();
    if (this.mediaQuery && this.onMediaChange) {
      this.mediaQuery.removeEventListener("change", this.onMediaChange);
    }
  }
}

// --- src/runtime/text-measurer.ts ---
/**
 * Dual-Mode Text Measurer (Browser Native Canvas 2D + Headless Fallback)
 */

                                     
                     
                   
                               
                      
                    
                 
 

                                    
                
                 
                     
                
                 
                  
     
 

export class TextMeasurer {
          ctx                                  = null;

  constructor() {
    if (typeof document !== "undefined") {
      try {
        const canvas = document.createElement("canvas");
        this.ctx = canvas.getContext("2d");
      } catch {
        this.ctx = null;
      }
    }
  }

  measureLineWidth(
    text        ,
    fontSize        ,
    fontFamily        ,
    fontWeight                  = 400,
    mono = false
  )         {
    if (!text) return 0;
    if (this.ctx) {
      this.ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      return Math.ceil(this.ctx.measureText(text).width);
    }
    return Math.ceil(this.estimateHeadlessWidth(text, fontSize, mono));
  }

          estimateHeadlessWidth(
    text        ,
    fontSize        ,
    mono         
  )         {
    let totalEm = 0;
    for (const ch of text) {
      const code = ch.codePointAt(0) || 0;
      if (mono) {
        totalEm += code > 0x2e80 ? 1.0 : 0.61;
      } else if (
        (code >= 0x2e80 && code <= 0x9fff) ||
        (code >= 0xf900 && code <= 0xfaff) ||
        (code >= 0xff00 && code <= 0xffef)
      ) {
        // CJK full-width
        totalEm += 1.02;
      } else if (code > 0x1f000) {
        // Emoji
        totalEm += 1.2;
      } else if ("ilI1|.,:;'!()[]".includes(ch)) {
        totalEm += 0.34;
      } else if ("mwMW@%".includes(ch)) {
        totalEm += 0.86;
      } else if (ch >= "A" && ch <= "Z") {
        totalEm += 0.68;
      } else {
        totalEm += 0.56;
      }
    }
    return totalEm * fontSize;
  }

  measureBlock(text        , options                    )                    {
    const fontSize = options.fontSize;
    const fontWeight = options.fontWeight ?? 400;
    const lineHeight = options.lineHeight ?? Math.round(fontSize * 1.45);
    const mono = options.mono ?? false;
    const rawParagraphs = (text || "").split(/\r?\n/);
    const wrappedLines                                         = [];

    for (const para of rawParagraphs) {
      if (!options.maxWidth || options.maxWidth <= 0 || !para) {
        const w = this.measureLineWidth(
          para,
          fontSize,
          options.fontFamily,
          fontWeight,
          mono
        );
        wrappedLines.push({ text: para, width: w });
        continue;
      }

      // Greedy token wrapping supporting mixed English words and CJK characters
      const tokens = para.match(/([A-Za-z0-9_./:-]+|\s+|.)/g) || [para];
      let currentLine = "";

      for (const token of tokens) {
        const candidate = currentLine + token;
        const candidateWidth = this.measureLineWidth(
          candidate,
          fontSize,
          options.fontFamily,
          fontWeight,
          mono
        );
        if (candidateWidth > options.maxWidth && currentLine.trim().length > 0) {
          wrappedLines.push({
            text: currentLine.trimEnd(),
            width: this.measureLineWidth(
              currentLine.trimEnd(),
              fontSize,
              options.fontFamily,
              fontWeight,
              mono
            ),
          });
          currentLine = token.trimStart();
        } else {
          currentLine = candidate;
        }
      }

      if (currentLine.length > 0) {
        wrappedLines.push({
          text: currentLine,
          width: this.measureLineWidth(
            currentLine,
            fontSize,
            options.fontFamily,
            fontWeight,
            mono
          ),
        });
      }
    }

    const maxLineWidth = wrappedLines.reduce(
      (max, l) => Math.max(max, l.width),
      0
    );

    return {
      width: maxLineWidth,
      height: Math.max(lineHeight, wrappedLines.length * lineHeight),
      lineHeight,
      lines: wrappedLines,
    };
  }
}

// --- src/runtime/rough-adapter.ts ---
/**
 * Deterministic Hand-Drawn ("Sketch" / Rough) SVG Path Generator
 * Generates organic double-stroke hand-drawn SVG paths without requiring external canvas/DOM dependencies.
 */

function hashStringSeed(str        )         {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

class SeededRandom {
          state        ;
  constructor(seedStr        ) {
    this.state = hashStringSeed(seedStr) || 123456789;
  }

  next()         {
    // Mulberry32 PRNG
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  offset(maxMag        )         {
    return (this.next() * 2 - 1) * maxMag;
  }
}

function roughLineSegment(
  x1        ,
  y1        ,
  x2        ,
  y2        ,
  rng              ,
  roughness = 1.25
)         {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const jitter = Math.min(2.4, Math.max(0.6, len * 0.012)) * roughness;

  const mid1X = x1 + (x2 - x1) * 0.35 + rng.offset(jitter);
  const mid1Y = y1 + (y2 - y1) * 0.35 + rng.offset(jitter);
  const mid2X = x1 + (x2 - x1) * 0.68 + rng.offset(jitter);
  const mid2Y = y1 + (y2 - y1) * 0.68 + rng.offset(jitter);

  const sx = x1 + rng.offset(jitter * 0.45);
  const sy = y1 + rng.offset(jitter * 0.45);
  const ex = x2 + rng.offset(jitter * 0.45);
  const ey = y2 + rng.offset(jitter * 0.45);

  return `M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${mid1X.toFixed(1)} ${mid1Y.toFixed(1)}, ${mid2X.toFixed(1)} ${mid2Y.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`;
}

export function generateRoughRectStrokePath(
  x        ,
  y        ,
  w        ,
  h        ,
  seedKey        ,
  roughness = 1.25
)         {
  const rng = new SeededRandom(seedKey);
  const corners                     = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];

  const strokes           = [];
  // Double pass for authentic hand-sketched look
  for (let pass = 0; pass < 2; pass++) {
    const r = pass === 0 ? roughness : roughness * 0.75;
    for (let i = 0; i < 4; i++) {
      const p1 = corners[i];
      const p2 = corners[(i + 1) % 4];
      strokes.push(roughLineSegment(p1[0], p1[1], p2[0], p2[1], rng, r));
    }
  }
  return strokes.join(" ");
}

export function generateRoughPolygonStrokePath(
  points                    ,
  seedKey        ,
  roughness = 1.25
)         {
  if (points.length < 2) return "";
  const rng = new SeededRandom(seedKey);
  const strokes           = [];

  for (let pass = 0; pass < 2; pass++) {
    const r = pass === 0 ? roughness : roughness * 0.7;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      strokes.push(roughLineSegment(p1[0], p1[1], p2[0], p2[1], rng, r));
    }
  }
  return strokes.join(" ");
}

export function generateRoughEllipseStrokePath(
  cx        ,
  cy        ,
  rx        ,
  ry        ,
  seedKey        ,
  roughness = 1.25
)         {
  const rng = new SeededRandom(seedKey);
  const steps = 16;
  const strokes           = [];

  for (let pass = 0; pass < 2; pass++) {
    const pts                     = [];
    const jitter = (pass === 0 ? 1.5 : 1.0) * roughness;
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * Math.PI * 2 + (pass === 1 ? 0.15 : 0);
      pts.push([
        cx + Math.cos(theta) * rx + rng.offset(jitter),
        cy + Math.sin(theta) * ry + rng.offset(jitter),
      ]);
    }
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
    }
    strokes.push(d);
  }

  return strokes.join(" ");
}

export function generateRoughLinePath(
  x1        ,
  y1        ,
  x2        ,
  y2        ,
  seedKey        ,
  roughness = 1.1
)         {
  const rng = new SeededRandom(seedKey);
  return [
    roughLineSegment(x1, y1, x2, y2, rng, roughness * 0.8),
    roughLineSegment(x1, y1, x2, y2, rng, roughness * 0.5),
  ].join(" ");
}

/**
 * Generates a continuous hand-sketched companion stroke along a polyline of waypoints
 * for Sketch-mode connection edges while keeping start/end tangents aligned with markers.
 */
export function generateRoughEdgeCompanionPath(
  points                    ,
  seedKey        ,
  roughness = 1.15
)         {
  if (points.length < 2) return "";
  const rng = new SeededRandom(seedKey);
  const segs           = [];

  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 1) continue;
    const jitter = Math.min(2.2, Math.max(0.5, len * 0.014)) * roughness;
    const mid1X = x1 + (x2 - x1) * 0.33 + rng.offset(jitter);
    const mid1Y = y1 + (y2 - y1) * 0.33 + rng.offset(jitter);
    const mid2X = x1 + (x2 - x1) * 0.67 + rng.offset(jitter);
    const mid2Y = y1 + (y2 - y1) * 0.67 + rng.offset(jitter);
    if (i === 0) {
      segs.push(`M ${x1.toFixed(1)} ${y1.toFixed(1)}`);
    }
    segs.push(
      `C ${mid1X.toFixed(1)} ${mid1Y.toFixed(1)}, ${mid2X.toFixed(1)} ${mid2Y.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`
    );
  }

  return segs.join(" ");
}

// --- src/compiler/layout-solver.ts ---
/**
 * Three-Tier Hybrid Layout Solver & Compound Component Macro Expander
 * Supports:
 *  1. Container Flow Layout (Flex Row/Column & Grid)
 *  2. Sibling Relative Anchor Placement (Topological DAG Solver: rightOf / leftOf / below / above)
 *  3. Absolute Coordinates & Auto-Positioned Callouts
 *  4. Sub-Anchor Registration (code-block lines: id.line_N, table cells: id.cell_R_C)
 *  5. Mobile Responsive Reflow (compactViewport mode)
 */


function normalizePadding(
  pad                                                                          ,
  defaultPad                                  
)                                   {
  if (pad === undefined) return defaultPad;
  if (typeof pad === "number") return [pad, pad, pad, pad];
  if (pad.length === 2) return [pad[0], pad[1], pad[0], pad[1]];
  return pad;
}

const CODE_KEYWORDS = new Set([
  "import",
  "export",
  "from",
  "const",
  "let",
  "var",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "switch",
  "case",
  "break",
  "continue",
  "class",
  "interface",
  "type",
  "extends",
  "implements",
  "new",
  "async",
  "await",
  "try",
  "catch",
  "throw",
  "def",
  "fn",
  "pub",
  "struct",
  "enum",
  "impl",
  "match",
  "use",
  "package",
  "func",
  "go",
  "defer",
  "select",
  "chan",
  "true",
  "false",
  "null",
  "undefined",
  "nil",
  "void",
]);

function tokenizeCodeLine(
  line        ,
  baseColor        
)                    {
  if (!line) return [{ text: "", color: baseColor }];

  // Full-line comment or markdown heading/fence
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//") || trimmed.startsWith("--")) {
    return [{ text: line, color: "#64748b" }];
  }
  if (trimmed.startsWith("```")) {
    return [{ text: line, color: "#38bdf8", fontWeight: 600 }];
  }
  if (trimmed.startsWith("#")) {
    return [{ text: line, color: "#94a3b8", fontWeight: 600 }];
  }

  const tokens                    = [];
  const regex =
    /(\/\/.*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b0x[0-9a-fA-F]+\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_-]*\b(?=\s*:)|\b[A-Za-z_][A-Za-z0-9_]*\b|\s+|[^\s"A-Za-z0-9_]+)/g;

  let match                        ;
  while ((match = regex.exec(line)) !== null) {
    const raw = match[0];
    if (raw.startsWith("//")) {
      tokens.push({ text: raw, color: "#64748b" });
    } else if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'")) ||
      (raw.startsWith("`") && raw.endsWith("`"))
    ) {
      tokens.push({ text: raw, color: "#34d399" });
    } else if (/^(0x[0-9a-fA-F]+|\d+(?:\.\d+)?)$/.test(raw)) {
      tokens.push({ text: raw, color: "#fb923c" });
    } else if (
      /^[A-Za-z_][A-Za-z0-9_-]*$/.test(raw) &&
      line.slice(match.index + raw.length).trimStart().startsWith(":")
    ) {
      // Property / YAML key
      tokens.push({ text: raw, color: "#38bdf8" });
    } else if (CODE_KEYWORDS.has(raw)) {
      tokens.push({ text: raw, color: "#c084fc", fontWeight: 600 });
    } else if (/^[A-Z][A-Za-z0-9_]*$/.test(raw)) {
      tokens.push({ text: raw, color: "#fbbf24" });
    } else {
      tokens.push({ text: raw, color: baseColor });
    }
  }

  return tokens.length > 0 ? tokens : [{ text: line, color: baseColor }];
}

export class HybridLayoutSolver {
          idCounter = 0;
          measurer              ;
          theme                     ;
          connections                   = [];

  constructor(
    measurer              ,
    theme                     
  ) {
    this.measurer = measurer;
    this.theme = theme;
  }

  solve(spec                  , options                = {})               {
    this.idCounter = 0;
    this.connections = spec.connections || [];
    const compact = options.compactViewport ?? false;
    const anchorRegistry                              = {};

    // Pass 1: Build and measure all nodes bottom-up (local coordinates)
    const rootSpecs = spec.elements || [];
    const calloutSpecs                       = [];
    const regularSpecs                = [];

    for (const el of rootSpecs) {
      if (
        el.type === "callout" &&
        el.target &&
        el.x === undefined &&
        el.y === undefined &&
        !el.place
      ) {
        calloutSpecs.push(el);
      } else {
        regularSpecs.push(el);
      }
    }

    const rootNodes = regularSpecs.map((el) =>
      this.measureElement(el, compact)
    );

    // Pass 2: Layout root container children (Flex/Grid or Relative/Free)
    const rootLayout               = spec.canvas?.layout || {
      type: "free",
    };
    this.positionSiblings(rootNodes, regularSpecs, rootLayout, compact);

    // Convert nested child coordinates from parent-relative to world coordinates ONCE
    this.convertTreeToWorldCoordinates(rootNodes, 0, 0);

    // Normalize top-left offset and apply canvas padding
    const canvasPad = normalizePadding(spec.canvas?.padding, [32, 32, 32, 32]);

    // First register preliminary world coordinates so auto-callouts can find their target anchors
    this.shiftAndRegisterWorldBounds(rootNodes, canvasPad, anchorRegistry);

    // Pass 2b: Position auto-targeted callouts relative to their target node or sub-anchor
    const calloutNodes              = [];
    for (const cSpec of calloutSpecs) {
      const cNode = this.measureElement(cSpec, compact);
      const targetBox = anchorRegistry[cSpec.target ];
      const ownerBox =
        targetBox?.ownerNodeId && anchorRegistry[targetBox.ownerNodeId]
          ? anchorRegistry[targetBox.ownerNodeId]
          : targetBox;
      const side = compact
        ? cSpec.side === "left" || cSpec.side === "right"
          ? "top"
          : cSpec.side || "top"
        : cSpec.side || "top";

      if (targetBox && ownerBox) {
        const gap = 18;
        if (side === "top") {
          cNode.x = targetBox.x + (targetBox.width - cNode.width) / 2;
          cNode.y = Math.min(targetBox.y, ownerBox.y) - cNode.height - gap;
        } else if (side === "bottom") {
          cNode.x = targetBox.x + (targetBox.width - cNode.width) / 2;
          cNode.y =
            Math.max(
              targetBox.y + targetBox.height,
              ownerBox.y + ownerBox.height
            ) + gap;
        } else if (side === "left") {
          cNode.x = Math.min(targetBox.x, ownerBox.x) - cNode.width - gap;
          cNode.y = targetBox.y + (targetBox.height - cNode.height) / 2;
        } else {
          cNode.x =
            Math.max(
              targetBox.x + targetBox.width,
              ownerBox.x + ownerBox.width
            ) + gap;
          cNode.y = targetBox.y + (targetBox.height - cNode.height) / 2;
        }
      }
      this.convertTreeToWorldCoordinates([cNode], 0, 0);
      calloutNodes.push(cNode);
    }

    const allNodes = [...rootNodes, ...calloutNodes];

    // Re-normalize world coordinates so no node has negative X or Y
    let minX = Infinity;
    let minY = Infinity;
    for (const n of allNodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
    }
    if (!Number.isFinite(minX)) minX = 0;
    if (!Number.isFinite(minY)) minY = 0;

    const shiftX = canvasPad[3] - minX;
    const shiftY = canvasPad[0] - minY;

    for (const key of Object.keys(anchorRegistry)) {
      delete anchorRegistry[key];
    }

    for (const node of allNodes) {
      this.translateWorldTree(node, shiftX, shiftY, anchorRegistry);
    }

    let maxX = 0;
    let maxY = 0;
    for (const node of allNodes) {
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }

    const totalWidth =
      typeof spec.canvas?.width === "number"
        ? spec.canvas.width
        : Math.max(320, Math.ceil(maxX + canvasPad[1]));
    const totalHeight =
      typeof spec.canvas?.height === "number"
        ? spec.canvas.height
        : Math.max(180, Math.ceil(maxY + canvasPad[2]));

    return {
      nodes: allNodes,
      anchorRegistry,
      width: totalWidth,
      height: totalHeight,
    };
  }

          convertTreeToWorldCoordinates(
    nodes             ,
    parentX        ,
    parentY        
  )       {
    for (const node of nodes) {
      node.x += parentX;
      node.y += parentY;
      if (node.children.length > 0) {
        this.convertTreeToWorldCoordinates(node.children, node.x, node.y);
      }
    }
  }

          shiftAndRegisterWorldBounds(
    nodes             ,
    canvasPad                                  ,
    registry                             
  )       {
    let minX = Infinity;
    let minY = Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
    }
    if (!Number.isFinite(minX)) minX = 0;
    if (!Number.isFinite(minY)) minY = 0;

    const dx = canvasPad[3] - minX;
    const dy = canvasPad[0] - minY;
    for (const n of nodes) {
      this.translateWorldTree(n, dx, dy, registry);
    }
  }

          translateWorldTree(
    node           ,
    dx        ,
    dy        ,
    registry                             ,
    parentGroupId         
  )       {
    node.x += dx;
    node.y += dy;

    registry[node.id] = {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      ownerNodeId: node.id,
      parentGroupId,
      shape: node.shape,
    };

    for (const sub of node.subAnchors) {
      registry[sub.anchorId] = {
        x: node.x + sub.x,
        y: node.y + sub.y,
        width: sub.width,
        height: sub.height,
        ownerNodeId: node.id,
        parentGroupId,
        shape: "rect",
      };
    }

    for (const child of node.children) {
      this.translateWorldTree(child, dx, dy, registry, node.id);
    }
  }

          nextId(prefix        )         {
    this.idCounter += 1;
    return `${prefix}_${this.idCounter}`;
  }

          measureElement(spec             , compact         )            {
    switch (spec.type) {
      case "card":
        return this.buildCardNode(spec, compact);
      case "code-block":
        return this.buildCodeBlockNode(spec);
      case "terminal":
        return this.buildTerminalNode(spec);
      case "table":
        return this.buildTableNode(spec);
      case "group":
      case "window":
        return this.buildGroupOrWindowNode(spec, compact);
      case "callout":
        return this.buildCalloutNode(spec);
      case "badge":
        return this.buildBadgeNode(spec);
      case "text":
        return this.buildTextNode(spec);
      case "icon":
        return this.buildIconNode(spec);
      case "polygon":
        return this.buildPolygonNode(spec);
      case "path":
        return this.buildPathNode(spec);
      case "bitfield":
        return this.buildBitfieldNode(spec);
      case "sequence":
        return this.buildSequenceNode(spec);
      case "rect":
      case "circle":
      case "ellipse":
      case "diamond":
      case "cylinder":
      case "queue":
      default:
        return this.buildPrimitiveShapeNode(spec                   );
    }
  }

  // ==========================================================================
  // Compound Component Macro Builders
  // ==========================================================================

          buildCardNode(spec                 , compact         )            {
    const id = spec.id || this.nextId("card");
    const style = resolveNodeStyle(spec.style, this.theme, "soft", "neutral");
    const pad = normalizePadding(spec.padding, [14, 16, 14, 16]);
    const fontSans = this.theme.typography.fontSans;
    const fontMono = this.theme.typography.fontMono;

    const titleSize = 14;
    const bodySize = 12;
    const iconOffset = spec.icon ? 24 : 0;
    const titleWidth = this.measurer.measureLineWidth(
      spec.title,
      titleSize,
      fontSans,
      600
    );

    const badgeWidth = spec.badge
      ? this.measurer.measureLineWidth(spec.badge, 10, fontMono, 600, true) + 14
      : 0;

    const headerRowWidth =
      iconOffset + titleWidth + (badgeWidth > 0 ? badgeWidth + 12 : 0);

    const bodyBlock = spec.body
      ? this.measurer.measureBlock(spec.body, {
          fontFamily: fontSans,
          fontSize: bodySize,
          lineHeight: 18,
          maxWidth: typeof spec.width === "number" ? spec.width - pad[1] - pad[3] : 240,
        })
      : null;

    // Optional nested children inside card
    const childSpecs = spec.children || [];
    const childNodes = childSpecs.map((c) => this.measureElement(c, compact));
    let childrenWidth = 0;
    let childrenHeight = 0;
    if (childNodes.length > 0) {
      const cardLayout               = spec.layout || {
        type: "flex",
        direction: "column",
        gap: 10,
      };
      const box = this.positionSiblings(
        childNodes,
        childSpecs,
        cardLayout,
        compact
      );
      childrenWidth = box.width;
      childrenHeight = box.height;
    }

    const contentWidth = Math.max(
      headerRowWidth,
      bodyBlock ? bodyBlock.width : 0,
      childrenWidth,
      150
    );

    const width =
      typeof spec.width === "number"
        ? spec.width
        : Math.ceil(contentWidth + pad[1] + pad[3]);

    let cursorY = pad[0];
    const decorations                        = [];

    // Header icon
    if (spec.icon) {
      decorations.push({
        kind: "icon",
        iconName: spec.icon,
        x: pad[3],
        y: cursorY + 1,
        width: 16,
        height: 16,
        stroke:
          style.variant === "filled"
            ? style.textColor
            : this.theme.colors.tones[style.tone].main,
      });
    }

    // Header title
    decorations.push({
      kind: "text",
      x: pad[3] + iconOffset,
      y: cursorY + 13,
      text: spec.title,
      fontFamily: fontSans,
      fontSize: titleSize,
      fontWeight: 600,
      textColor: style.textColor,
    });

    // Optional Badge pill on top-right
    if (spec.badge) {
      const bx = width - pad[1] - badgeWidth;
      const by = cursorY - 1;
      const tonePalette = this.theme.colors.tones[style.tone];
      decorations.push({
        kind: "rect",
        x: bx,
        y: by,
        width: badgeWidth,
        height: 18,
        rx: 9,
        fill:
          style.variant === "filled"
            ? "rgba(255,255,255,0.22)"
            : mixColors(tonePalette.main, this.theme.colors.bg, 0.22),
        stroke:
          style.variant === "filled" ? "transparent" : tonePalette.softBorder,
        strokeWidth: 1,
      });
      decorations.push({
        kind: "text",
        x: bx + badgeWidth / 2,
        y: by + 12.5,
        text: spec.badge,
        fontFamily: fontMono,
        fontSize: 10,
        fontWeight: 600,
        textColor:
          style.variant === "filled" ? style.textColor : tonePalette.main,
        textAnchor: "middle",
      });
    }

    cursorY += 20;

    if (spec.subtitle) {
      cursorY += 2;
      decorations.push({
        kind: "text",
        x: pad[3],
        y: cursorY + 11,
        text: spec.subtitle,
        fontFamily: fontMono,
        fontSize: 11,
        textColor: style.mutedTextColor,
      });
      cursorY += 16;
    }

    if (bodyBlock && bodyBlock.lines.length > 0) {
      cursorY += 6;
      for (const line of bodyBlock.lines) {
        decorations.push({
          kind: "text",
          x: pad[3],
          y: cursorY + 12,
          text: line.text,
          fontFamily: fontSans,
          fontSize: bodySize,
          textColor: style.mutedTextColor,
        });
        cursorY += bodyBlock.lineHeight;
      }
    }

    if (childNodes.length > 0) {
      cursorY += 10;
      for (const child of childNodes) {
        child.x += pad[3];
        child.y += cursorY;
      }
      cursorY += childrenHeight;
    }

    const height =
      typeof spec.height === "number"
        ? spec.height
        : Math.ceil(cursorY + pad[2]);

    return {
      id,
      type: "card",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: "rect",
      decorations,
      subAnchors: [],
      children: childNodes,
    };
  }

          buildCodeBlockNode(spec                      )            {
    const id = spec.id || this.nextId("code");
    const style = resolveNodeStyle(
      spec.style,
      this.theme,
      "outlined",
      "neutral"
    );
    style.fill = this.theme.colors.codeBg;
    style.stroke =
      style.tone === "neutral"
        ? mixColors(this.theme.colors.border, "#1e293b", 0.5)
        : this.theme.colors.tones[style.tone].softBorder;

    const fontMono = this.theme.typography.fontMono;
    const rawLines = (spec.code || "").replace(/\s+$/, "").split(/\r?\n/);
    const codeFontSize = 12;
    const lineHeight = 22;
    const headerHeight = 32;
    const padX = 14;
    const padBottom = 10;
    const gutterWidth = 26;

    let maxCodeLineW = 140;
    for (const line of rawLines) {
      const w = this.measurer.measureLineWidth(
        line,
        codeFontSize,
        fontMono,
        400,
        true
      );
      maxCodeLineW = Math.max(maxCodeLineW, w);
    }

    const width =
      typeof spec.width === "number"
        ? spec.width
        : Math.ceil(padX * 2 + gutterWidth + maxCodeLineW + 18);
    const height =
      typeof spec.height === "number"
        ? spec.height
        : Math.ceil(headerHeight + 8 + rawLines.length * lineHeight + padBottom);

    const decorations                        = [];
    const subAnchors                        = [];

    // Header divider line
    decorations.push({
      kind: "line",
      x: 0,
      y: headerHeight,
      x2: width,
      y2: headerHeight,
      stroke: "#1e293b",
      strokeWidth: 1,
    });

    // macOS window control dots
    const dotColors = ["#ef4444", "#f59e0b", "#10b981"];
    dotColors.forEach((col, i) => {
      decorations.push({
        kind: "circle",
        x: 14 + i * 14,
        y: headerHeight / 2,
        r: 4.2,
        fill: col,
      });
    });

    // Title in header
    if (spec.title) {
      decorations.push({
        kind: "text",
        x: 62,
        y: headerHeight / 2 + 4,
        text: spec.title,
        fontFamily: fontMono,
        fontSize: 11,
        fontWeight: 600,
        textColor: "#94a3b8",
      });
    }

    // Language badge
    if (spec.lang) {
      decorations.push({
        kind: "text",
        x: width - 12,
        y: headerHeight / 2 + 4,
        text: spec.lang.toUpperCase(),
        fontFamily: fontMono,
        fontSize: 10,
        fontWeight: 600,
        textColor: "#64748b",
        textAnchor: "end",
      });
    }

    const highlightSet = new Set(spec.highlightLines || []);
    const highlightTone =
      style.tone === "neutral" ? "primary" : style.tone;
    const highlightColor = this.theme.colors.tones[highlightTone].main;

    rawLines.forEach((lineText, idx) => {
      const lineNum = idx + 1;
      const lineY = headerHeight + 6 + idx * lineHeight;
      const isHighlighted = highlightSet.has(lineNum);
      const anchorId = `${id}.line_${lineNum}`;

      // Register sub-anchor for every code line so arrows can point to or from any line!
      subAnchors.push({
        anchorId,
        x: 0,
        y: lineY,
        width,
        height: lineHeight,
        highlight: isHighlighted,
        tone: highlightTone,
      });

      if (isHighlighted) {
        decorations.push({
          kind: "code-line",
          anchorId,
          x: 2,
          y: lineY,
          width: width - 4,
          height: lineHeight,
          fill: mixColors(highlightColor, "#080c14", 0.22),
        });
        // Left accent indicator bar
        decorations.push({
          kind: "rect",
          x: 2,
          y: lineY,
          width: 3,
          height: lineHeight,
          fill: highlightColor,
        });
      } else {
        decorations.push({
          kind: "code-line",
          anchorId,
          x: 2,
          y: lineY,
          width: width - 4,
          height: lineHeight,
          fill: "transparent",
        });
      }

      // Line number
      decorations.push({
        kind: "text",
        x: padX + 14,
        y: lineY + 15,
        text: String(lineNum),
        fontFamily: fontMono,
        fontSize: 11,
        textColor: isHighlighted ? highlightColor : "#475569",
        textAnchor: "end",
      });

      // Code text with lightweight syntax highlighting tokens
      const baseCodeColor = isHighlighted
        ? "#f8fafc"
        : this.theme.colors.codeText;
      decorations.push({
        kind: "text",
        x: padX + gutterWidth,
        y: lineY + 15,
        text: lineText,
        tokens: tokenizeCodeLine(lineText, baseCodeColor),
        fontFamily: fontMono,
        fontSize: codeFontSize,
        textColor: baseCodeColor,
      });
    });

    return {
      id,
      type: "code-block",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: "rect",
      decorations,
      subAnchors,
      children: [],
    };
  }

          buildTerminalNode(spec                     )            {
    const id = spec.id || this.nextId("term");
    const style = resolveNodeStyle(
      spec.style,
      this.theme,
      "outlined",
      "neutral"
    );
    style.fill = "#090d16";
    style.stroke = "#334155";

    const fontMono = this.theme.typography.fontMono;
    const headerHeight = 30;
    const lineHeight = 22;
    const padX = 14;
    const lines = spec.lines || [];

    let maxLineW = 180;
    for (const item of lines) {
      const text =
        typeof item === "string"
          ? item
          : `${item.prompt || "$"} ${item.cmd || ""}${item.output || ""}`;
      maxLineW = Math.max(
        maxLineW,
        this.measurer.measureLineWidth(text, 12, fontMono, 400, true)
      );
    }

    const width =
      typeof spec.width === "number"
        ? spec.width
        : Math.ceil(maxLineW + padX * 2 + 24);
    const height =
      typeof spec.height === "number"
        ? spec.height
        : Math.ceil(headerHeight + 10 + lines.length * lineHeight + 12);

    const decorations                        = [
      {
        kind: "line",
        x: 0,
        y: headerHeight,
        x2: width,
        y2: headerHeight,
        stroke: "#1e293b",
        strokeWidth: 1,
      },
    ];

    ["#ef4444", "#f59e0b", "#10b981"].forEach((col, i) => {
      decorations.push({
        kind: "circle",
        x: 14 + i * 14,
        y: headerHeight / 2,
        r: 4,
        fill: col,
      });
    });

    decorations.push({
      kind: "text",
      x: width / 2,
      y: headerHeight / 2 + 4,
      text: spec.title || "bash",
      fontFamily: fontMono,
      fontSize: 11,
      textColor: "#94a3b8",
      textAnchor: "middle",
    });

    const subAnchors                        = [];

    lines.forEach((item, idx) => {
      const lineNum = idx + 1;
      const lineY = headerHeight + 8 + idx * lineHeight;
      const y = lineY + 14;
      const anchorId = `${id}.line_${lineNum}`;
      const itemTone =
        typeof item === "object" && item.tone ? item.tone : undefined;

      subAnchors.push({
        anchorId,
        x: 0,
        y: lineY,
        width,
        height: lineHeight,
        highlight: Boolean(itemTone),
        tone: itemTone,
      });

      decorations.push({
        kind: "code-line",
        anchorId,
        x: 2,
        y: lineY,
        width: width - 4,
        height: lineHeight,
        fill: "transparent",
      });

      if (typeof item === "string") {
        decorations.push({
          kind: "text",
          x: padX,
          y,
          text: item,
          fontFamily: fontMono,
          fontSize: 12,
          textColor: "#e2e8f0",
        });
      } else {
        const promptStr = item.prompt ?? "$";
        if (item.cmd) {
          decorations.push({
            kind: "text",
            x: padX,
            y,
            text: promptStr,
            fontFamily: fontMono,
            fontSize: 12,
            fontWeight: 700,
            textColor: "#34d399",
          });
          decorations.push({
            kind: "text",
            x: padX + 18,
            y,
            text: item.cmd,
            fontFamily: fontMono,
            fontSize: 12,
            textColor: "#f8fafc",
          });
        } else if (item.output) {
          const outColor = item.tone
            ? this.theme.colors.tones[item.tone].main
            : "#94a3b8";
          decorations.push({
            kind: "text",
            x: padX,
            y,
            text: item.output,
            fontFamily: fontMono,
            fontSize: 12,
            textColor: outColor,
          });
        }
      }
    });

    return {
      id,
      type: "terminal",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: "rect",
      decorations,
      subAnchors,
      children: [],
    };
  }

          buildTableNode(spec                  )            {
    const id = spec.id || this.nextId("table");
    const style = resolveNodeStyle(
      spec.style,
      this.theme,
      "outlined",
      "neutral"
    );
    const fontSans = this.theme.typography.fontSans;
    const fontMono = this.theme.typography.fontMono;

    const headers = spec.headers || [];
    const rows = spec.rows || [];
    const colCount = Math.max(
      headers.length,
      ...rows.map((r) => r.length),
      1
    );

    const colWidths = new Array        (colCount).fill(72);
    const cellPadX = 14;
    const rowHeight = 32;
    const titleBarHeight = spec.title ? 30 : 0;
    const headerHeight = headers.length > 0 ? 32 : 0;

    headers.forEach((h, colIdx) => {
      const w =
        this.measurer.measureLineWidth(h, 12, fontSans, 600) + cellPadX * 2;
      colWidths[colIdx] = Math.max(colWidths[colIdx], w);
    });

    const getCellText = (cell                ) =>
      typeof cell === "string" ? cell : cell.text;

    rows.forEach((row) => {
      row.forEach((cell, colIdx) => {
        const text = getCellText(cell);
        const w =
          this.measurer.measureLineWidth(text, 12, fontMono, 500, true) +
          cellPadX * 2;
        colWidths[colIdx] = Math.max(colWidths[colIdx], w);
      });
    });

    const totalWidth = colWidths.reduce((acc, w) => acc + w, 0);
    const totalHeight =
      titleBarHeight + headerHeight + rows.length * rowHeight;

    const decorations                        = [];
    const subAnchors                        = [];
    const tonePalette = this.theme.colors.tones[style.tone];

    let cursorY = 0;

    if (spec.title) {
      decorations.push({
        kind: "rect",
        x: 1,
        y: 1,
        width: totalWidth - 2,
        height: titleBarHeight,
        rx: Math.max(0, style.radius - 1),
        fill: tonePalette.softBg,
      });
      decorations.push({
        kind: "text",
        x: cellPadX,
        y: titleBarHeight / 2 + 4,
        text: spec.title,
        fontFamily: fontSans,
        fontSize: 12,
        fontWeight: 600,
        textColor: style.textColor,
      });
      decorations.push({
        kind: "line",
        x: 0,
        y: titleBarHeight,
        x2: totalWidth,
        y2: titleBarHeight,
        stroke: style.stroke,
        strokeWidth: 1,
      });
      cursorY += titleBarHeight;
    }

    if (headers.length > 0) {
      let colX = 0;
      decorations.push({
        kind: "rect",
        x: 1,
        y: cursorY + 1,
        width: totalWidth - 2,
        height: headerHeight - 1,
        fill: this.theme.colors.surface,
      });
      headers.forEach((h, colIdx) => {
        const cw = colWidths[colIdx];
        decorations.push({
          kind: "text",
          x: colX + cellPadX,
          y: cursorY + headerHeight / 2 + 4,
          text: h,
          fontFamily: fontSans,
          fontSize: 11.5,
          fontWeight: 600,
          textColor: style.mutedTextColor,
        });
        colX += cw;
      });
      decorations.push({
        kind: "line",
        x: 0,
        y: cursorY + headerHeight,
        x2: totalWidth,
        y2: cursorY + headerHeight,
        stroke: style.stroke,
        strokeWidth: 1,
      });
      cursorY += headerHeight;
    }

    rows.forEach((row, rIdx) => {
      let colX = 0;
      const rowY = cursorY + rIdx * rowHeight;

      if (rIdx > 0) {
        decorations.push({
          kind: "line",
          x: 0,
          y: rowY,
          x2: totalWidth,
          y2: rowY,
          stroke: this.theme.colors.border,
          strokeWidth: 1,
        });
      }

      for (let cIdx = 0; cIdx < colCount; cIdx++) {
        const cw = colWidths[cIdx];
        const cell = row[cIdx] ?? "";
        const cellText = getCellText(cell);
        const cellTone                           =
          typeof cell === "object" ? cell.tone : undefined;
        const anchorId = `${id}.cell_${rIdx}_${cIdx}`;

        subAnchors.push({
          anchorId,
          x: colX,
          y: rowY,
          width: cw,
          height: rowHeight,
          highlight: Boolean(cellTone),
          tone: cellTone,
        });

        decorations.push({
          kind: "table-cell",
          anchorId,
          x: colX + 1,
          y: rowY + 1,
          width: cw - 2,
          height: rowHeight - 2,
          fill: cellTone
            ? this.theme.colors.tones[cellTone].softBg
            : "transparent",
        });

        if (cIdx > 0) {
          decorations.push({
            kind: "line",
            x: colX,
            y: rowY,
            x2: colX,
            y2: rowY + rowHeight,
            stroke: this.theme.colors.border,
            strokeWidth: 1,
          });
        }

        decorations.push({
          kind: "text",
          x: colX + cellPadX,
          y: rowY + rowHeight / 2 + 4,
          text: cellText,
          fontFamily: fontMono,
          fontSize: 12,
          fontWeight: cellTone ? 600 : 400,
          textColor: cellTone
            ? this.theme.colors.tones[cellTone].main
            : style.textColor,
        });

        colX += cw;
      }
    });

    return {
      id,
      type: "table",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width: totalWidth,
      height: totalHeight,
      style,
      shape: "rect",
      decorations,
      subAnchors,
      children: [],
    };
  }

          buildGroupOrWindowNode(
    spec                  ,
    compact         
  )            {
    const id = spec.id || this.nextId(spec.type);
    const defaultVariant = spec.type === "window" ? "outlined" : "dashed";
    const style = resolveNodeStyle(
      spec.style,
      this.theme,
      defaultVariant,
      "neutral"
    );

    const headerHeight =
      spec.type === "window" ? 36 : spec.title ? 34 : 0;
    const pad = normalizePadding(spec.padding, [18, 20, 20, 20]);

    const childSpecs = spec.children || [];
    const childNodes = childSpecs.map((c) => this.measureElement(c, compact));

    const layout               = spec.layout || {
      type: "flex",
      direction: "column",
      gap: 16,
    };

    const childrenBox = this.positionSiblings(
      childNodes,
      childSpecs,
      layout,
      compact
    );

    const titleWidth = spec.title
      ? this.measurer.measureLineWidth(
          spec.title,
          12.5,
          this.theme.typography.fontSans,
          600
        ) + 40
      : 0;

    const width =
      typeof spec.width === "number"
        ? spec.width
        : Math.ceil(
            Math.max(childrenBox.width + pad[1] + pad[3], titleWidth, 180)
          );
    const height =
      typeof spec.height === "number"
        ? spec.height
        : Math.ceil(headerHeight + childrenBox.height + pad[0] + pad[2]);

    // Offset children by padding and header
    for (const child of childNodes) {
      child.x += pad[3];
      child.y += headerHeight + pad[0];
    }

    const decorations                        = [];
    const tonePalette = this.theme.colors.tones[style.tone];

    if (spec.type === "window") {
      decorations.push({
        kind: "line",
        x: 0,
        y: headerHeight,
        x2: width,
        y2: headerHeight,
        stroke: style.stroke,
        strokeWidth: 1,
      });
      ["#ef4444", "#f59e0b", "#10b981"].forEach((col, i) => {
        decorations.push({
          kind: "circle",
          x: 16 + i * 14,
          y: headerHeight / 2,
          r: 4.2,
          fill: col,
        });
      });
      if (spec.url || spec.title) {
        const barW = Math.min(width - 110, 260);
        const barX = (width - barW) / 2;
        decorations.push({
          kind: "rect",
          x: barX,
          y: 7,
          width: barW,
          height: 22,
          rx: 6,
          fill: this.theme.colors.surface,
          stroke: this.theme.colors.border,
          strokeWidth: 1,
        });
        decorations.push({
          kind: "text",
          x: width / 2,
          y: headerHeight / 2 + 4,
          text: spec.url || spec.title || "",
          fontFamily: this.theme.typography.fontMono,
          fontSize: 11,
          textColor: style.mutedTextColor,
          textAnchor: "middle",
        });
      }
    } else if (spec.title) {
      // Group badge header pill
      const pillW =
        this.measurer.measureLineWidth(
          spec.title,
          12,
          this.theme.typography.fontSans,
          600
        ) + 20;
      decorations.push({
        kind: "rect",
        x: 14,
        y: 10,
        width: pillW,
        height: 22,
        rx: 6,
        fill: tonePalette.softBg,
        stroke: tonePalette.softBorder,
        strokeWidth: 1,
      });
      decorations.push({
        kind: "text",
        x: 24,
        y: 25,
        text: spec.title,
        fontFamily: this.theme.typography.fontSans,
        fontSize: 11.5,
        fontWeight: 600,
        textColor:
          style.tone === "neutral" ? style.textColor : tonePalette.main,
      });
    }

    return {
      id,
      type: spec.type,
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: "rect",
      decorations,
      subAnchors: [],
      children: childNodes,
    };
  }

          buildCalloutNode(spec                    )            {
    const id = spec.id || this.nextId("callout");
    const style = resolveNodeStyle(spec.style, this.theme, "soft", "warning");
    style.radius = 8;

    const fontSans = this.theme.typography.fontSans;
    const block = this.measurer.measureBlock(spec.text, {
      fontFamily: fontSans,
      fontSize: 11.5,
      lineHeight: 17,
      maxWidth: 210,
    });

    const padX = 12;
    const padY = 8;
    const width =
      typeof spec.width === "number"
        ? spec.width
        : Math.ceil(block.width + padX * 2);
    const height =
      typeof spec.height === "number"
        ? spec.height
        : Math.ceil(block.height + padY * 2);

    const decorations                        = [];
    block.lines.forEach((line, idx) => {
      decorations.push({
        kind: "text",
        x: padX,
        y: padY + 12 + idx * block.lineHeight,
        text: line.text,
        fontFamily: fontSans,
        fontSize: 11.5,
        fontWeight: 500,
        textColor: style.textColor,
      });
    });

    return {
      id,
      type: "callout",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: "rect",
      calloutTail: spec.target
        ? {
            targetId: spec.target,
            side: spec.side || "top",
          }
        : undefined,
      decorations,
      subAnchors: [],
      children: [],
    };
  }

          buildBadgeNode(spec                  )            {
    const id = spec.id || this.nextId("badge");
    const style = resolveNodeStyle(spec.style, this.theme, "filled", "primary");
    style.radius = 999;

    const textW = this.measurer.measureLineWidth(
      spec.text,
      11.5,
      this.theme.typography.fontMono,
      600,
      true
    );
    const width =
      typeof spec.width === "number" ? spec.width : Math.ceil(textW + 24);
    const height = typeof spec.height === "number" ? spec.height : 26;

    return {
      id,
      type: "badge",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: "rect",
      decorations: [
        {
          kind: "text",
          x: width / 2,
          y: height / 2 + 4,
          text: spec.text,
          fontFamily: this.theme.typography.fontMono,
          fontSize: 11.5,
          fontWeight: 600,
          textColor: style.textColor,
          textAnchor: "middle",
        },
      ],
      subAnchors: [],
      children: [],
    };
  }

          buildTextNode(spec                 )            {
    const id = spec.id || this.nextId("text");
    const style = resolveNodeStyle(spec.style, this.theme, "ghost", "neutral");
    const sizeMap                         = {
      xs: 11,
      sm: 12,
      md: 14,
      lg: 17,
      xl: 22,
    };
    const fontSize =
      typeof spec.fontSize === "number"
        ? spec.fontSize
        : sizeMap[spec.fontSize || "md"] || 14;
    const fontFamily = spec.mono
      ? this.theme.typography.fontMono
      : this.theme.typography.fontSans;
    const fontWeight =
      spec.fontWeight === "bold"
        ? 700
        : spec.fontWeight === "medium"
        ? 600
        : 400;

    const block = this.measurer.measureBlock(spec.text, {
      fontFamily,
      fontSize,
      fontWeight,
      maxWidth: spec.maxWidth,
      mono: spec.mono,
    });

    const width =
      typeof spec.width === "number" ? spec.width : Math.ceil(block.width + 4);
    const height =
      typeof spec.height === "number"
        ? spec.height
        : Math.ceil(block.height + 4);

    const textColor =
      spec.style?.tone && spec.style.tone !== "neutral"
        ? this.theme.colors.tones[spec.style.tone].main
        : this.theme.colors.text;

    const decorations                        = block.lines.map((line, i) => ({
      kind: "text",
      x:
        spec.align === "center"
          ? width / 2
          : spec.align === "right"
          ? width
          : 0,
      y: fontSize + i * block.lineHeight,
      text: line.text,
      fontFamily,
      fontSize,
      fontWeight,
      textColor,
      textAnchor:
        spec.align === "center"
          ? "middle"
          : spec.align === "right"
          ? "end"
          : "start",
    }));

    return {
      id,
      type: "text",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: "none",
      decorations,
      subAnchors: [],
      children: [],
    };
  }

          buildIconNode(spec                 )            {
    const id = spec.id || this.nextId("icon");
    const style = resolveNodeStyle(spec.style, this.theme, "soft", "primary");
    const iconSize = spec.size || 24;
    const boxSize = iconSize + 20;
    const labelW = spec.label
      ? this.measurer.measureLineWidth(
          spec.label,
          12,
          this.theme.typography.fontSans,
          500
        )
      : 0;
    const width = Math.max(boxSize, labelW + 12);
    const height = spec.label ? boxSize + 22 : boxSize;

    const decorations                        = [
      {
        kind: "icon",
        iconName: spec.name,
        x: (width - iconSize) / 2,
        y: (boxSize - iconSize) / 2,
        width: iconSize,
        height: iconSize,
        stroke:
          style.variant === "filled"
            ? style.textColor
            : this.theme.colors.tones[style.tone].main,
      },
    ];

    if (spec.label) {
      decorations.push({
        kind: "text",
        x: width / 2,
        y: boxSize + 15,
        text: spec.label,
        fontFamily: this.theme.typography.fontSans,
        fontSize: 12,
        fontWeight: 500,
        textColor: this.theme.colors.text,
        textAnchor: "middle",
      });
    }

    return {
      id,
      type: "icon",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: "rect",
      decorations,
      subAnchors: [],
      children: [],
    };
  }

          buildPolygonNode(spec                    )            {
    const id = spec.id || this.nextId("poly");
    const style = resolveNodeStyle(spec.style, this.theme, "soft", "primary");
    const width = typeof spec.width === "number" ? spec.width : 110;
    const height = typeof spec.height === "number" ? spec.height : 100;

    let points = spec.points;
    if (!points || points.length === 0) {
      const sides = Math.max(3, spec.sides || 6);
      const startAngle = sides === 6 ? 0 : -Math.PI / 2;
      const rawPts                     = [];
      let minPx = Infinity;
      let maxPx = -Infinity;
      let minPy = Infinity;
      let maxPy = -Infinity;
      for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 * i) / sides + startAngle;
        const px = Math.cos(angle);
        const py = Math.sin(angle);
        rawPts.push([px, py]);
        minPx = Math.min(minPx, px);
        maxPx = Math.max(maxPx, px);
        minPy = Math.min(minPy, py);
        maxPy = Math.max(maxPy, py);
      }
      const spanX = Math.max(1e-3, maxPx - minPx);
      const spanY = Math.max(1e-3, maxPy - minPy);
      const pad = 2;
      points = rawPts.map(([px, py]) => [
        Math.round(pad + ((px - minPx) / spanX) * (width - pad * 2)),
        Math.round(pad + ((py - minPy) / spanY) * (height - pad * 2)),
      ]);
    }

    const decorations                        = [];
    if (spec.label) {
      decorations.push({
        kind: "text",
        x: width / 2,
        y: height / 2 + 4,
        text: spec.label,
        fontFamily: this.theme.typography.fontSans,
        fontSize: 13,
        fontWeight: 600,
        textColor: style.textColor,
        textAnchor: "middle",
      });
    }

    return {
      id,
      type: "polygon",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: "polygon",
      polygonPoints: points,
      decorations,
      subAnchors: [],
      children: [],
    };
  }

          buildPathNode(spec                 )            {
    const id = spec.id || this.nextId("path");
    const style = resolveNodeStyle(
      spec.style,
      this.theme,
      spec.closed ? "soft" : "ghost",
      "primary"
    );
    if (!spec.closed) {
      style.fill = "none";
      style.stroke = this.theme.colors.tones[style.tone].main;
      style.strokeWidth = 2;
    }

    return {
      id,
      type: "path",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width: typeof spec.width === "number" ? spec.width : 120,
      height: typeof spec.height === "number" ? spec.height : 80,
      style,
      shape: "path",
      pathD: spec.d,
      decorations: [],
      subAnchors: [],
      children: [],
    };
  }

          buildBitfieldNode(spec                     )            {
    const id = spec.id || this.nextId("bitfield");
    const style = resolveNodeStyle(
      spec.style,
      this.theme,
      "outlined",
      "primary"
    );
    const fontSans = this.theme.typography.fontSans;
    const fontMono = this.theme.typography.fontMono;
    const fields = spec.fields || [];

    const titleBarHeight = spec.title ? 30 : 0;
    const rulerHeight = 20;
    const cellHeight = 46;
    const padX = 12;

    const fieldWidths           = [];
    const bitCounts           = [];

    for (const f of fields) {
      const bitNum =
        typeof f.bits === "number"
          ? Math.max(1, f.bits)
          : parseInt(String(f.bits), 10) || 8;
      bitCounts.push(bitNum);

      const nameW = this.measurer.measureLineWidth(f.name, 12, fontMono, 600, true);
      const valW = f.value
        ? this.measurer.measureLineWidth(f.value, 10.5, fontMono, 400, true)
        : 0;
      const bitLabelW = this.measurer.measureLineWidth(
        typeof f.bits === "number" ? `${f.bits}b` : String(f.bits),
        9.5,
        fontMono,
        500,
        true
      );
      const minW = Math.max(nameW, valW + bitLabelW + 10, 56) + padX * 2;
      const propW = Math.min(200, Math.max(minW, bitNum * 7));
      fieldWidths.push(Math.ceil(propW));
    }

    const rawTotalW = Math.max(180, fieldWidths.reduce((a, b) => a + b, 0));
    const width = typeof spec.width === "number" ? spec.width : rawTotalW;
    const height =
      typeof spec.height === "number"
        ? spec.height
        : titleBarHeight + rulerHeight + cellHeight;

    const decorations                        = [];
    const subAnchors                        = [];
    const tonePalette = this.theme.colors.tones[style.tone];

    let cursorY = 0;

    if (spec.title) {
      decorations.push({
        kind: "rect",
        x: 1,
        y: 1,
        width: width - 2,
        height: titleBarHeight,
        rx: Math.max(0, style.radius - 1),
        fill: tonePalette.softBg,
      });
      decorations.push({
        kind: "text",
        x: padX,
        y: titleBarHeight / 2 + 4,
        text: spec.title,
        fontFamily: fontSans,
        fontSize: 12,
        fontWeight: 600,
        textColor: style.textColor,
      });
      if (spec.totalBits) {
        decorations.push({
          kind: "text",
          x: width - padX,
          y: titleBarHeight / 2 + 4,
          text: `${spec.totalBits}-bit`,
          fontFamily: fontMono,
          fontSize: 10.5,
          fontWeight: 600,
          textColor: tonePalette.main,
          textAnchor: "end",
        });
      }
      decorations.push({
        kind: "line",
        x: 0,
        y: titleBarHeight,
        x2: width,
        y2: titleBarHeight,
        stroke: style.stroke,
        strokeWidth: 1,
      });
      cursorY += titleBarHeight;
    }

    // Bit offset ruler strip
    decorations.push({
      kind: "rect",
      x: 1,
      y: cursorY + 1,
      width: width - 2,
      height: rulerHeight - 1,
      fill: this.theme.colors.surface,
    });
    decorations.push({
      kind: "line",
      x: 0,
      y: cursorY + rulerHeight,
      x2: width,
      y2: cursorY + rulerHeight,
      stroke: this.theme.colors.border,
      strokeWidth: 1,
    });

    const cellY = cursorY + rulerHeight;
    let colX = 0;
    let bitCursor = 0;

    fields.forEach((f, idx) => {
      const fw =
        idx === fields.length - 1
          ? Math.max(fieldWidths[idx], width - colX)
          : fieldWidths[idx];
      const bitSpan = bitCounts[idx];
      const fTone = f.tone || style.tone;
      const fPalette = this.theme.colors.tones[fTone];
      const anchorId = `${id}.field_${idx}`;

      subAnchors.push({
        anchorId,
        x: colX,
        y: cellY,
        width: fw,
        height: cellHeight,
        highlight: Boolean(f.tone),
        tone: fTone,
      });

      // Start bit offset label in ruler
      decorations.push({
        kind: "text",
        x: colX + 6,
        y: cursorY + 13.5,
        text: String(bitCursor),
        fontFamily: fontMono,
        fontSize: 9.5,
        textColor: style.mutedTextColor,
      });

      if (idx === fields.length - 1) {
        decorations.push({
          kind: "text",
          x: colX + fw - 6,
          y: cursorY + 13.5,
          text: String(bitCursor + bitSpan - 1),
          fontFamily: fontMono,
          fontSize: 9.5,
          textColor: style.mutedTextColor,
          textAnchor: "end",
        });
      }

      // Field background cell
      decorations.push({
        kind: "table-cell",
        anchorId,
        x: colX + 1,
        y: cellY + 1,
        width: fw - 2,
        height: cellHeight - 2,
        fill: f.tone ? fPalette.softBg : "transparent",
      });

      if (idx > 0) {
        decorations.push({
          kind: "line",
          x: colX,
          y: cursorY,
          x2: colX,
          y2: cellY + cellHeight,
          stroke: this.theme.colors.border,
          strokeWidth: 1,
        });
      }

      // Field name
      decorations.push({
        kind: "text",
        x: colX + fw / 2,
        y: f.value ? cellY + 18 : cellY + 23,
        text: f.name,
        fontFamily: fontMono,
        fontSize: 12,
        fontWeight: 600,
        textColor: f.tone ? fPalette.main : style.textColor,
        textAnchor: "middle",
      });

      // Bit width / value sublabel
      const subText = f.value
        ? `${f.value} (${typeof f.bits === "number" ? `${f.bits}b` : f.bits})`
        : typeof f.bits === "number"
        ? `${f.bits} bits`
        : String(f.bits);
      decorations.push({
        kind: "text",
        x: colX + fw / 2,
        y: cellY + 35,
        text: subText,
        fontFamily: fontMono,
        fontSize: 10,
        textColor: style.mutedTextColor,
        textAnchor: "middle",
      });

      colX += fw;
      bitCursor += bitSpan;
    });

    return {
      id,
      type: "bitfield",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: "rect",
      decorations,
      subAnchors,
      children: [],
    };
  }

          buildSequenceNode(spec                     )            {
    const id = spec.id || this.nextId("seq");
    const style = resolveNodeStyle(
      spec.style,
      this.theme,
      "outlined",
      "neutral"
    );
    const fontSans = this.theme.typography.fontSans;
    const fontMono = this.theme.typography.fontMono;
    const actors = spec.actors || [];
    const messages = spec.messages || [];

    const titleBarHeight = spec.title ? 32 : 0;
    const padX = 24;
    const padTop = 16;
    const padBottom = 20;
    const actorBoxH = 40;
    const msgRowH = 44;

    // Measure minimum actor widths and message label widths between actors
    const actorWidths = actors.map((a) => {
      const lw = this.measurer.measureLineWidth(a.label, 12.5, fontSans, 600);
      const sw = a.sublabel
        ? this.measurer.measureLineWidth(a.sublabel, 10, fontMono, 400, true)
        : 0;
      return Math.max(96, Math.ceil(Math.max(lw, sw) + 28));
    });

    const actorIndexById = new Map                ();
    actors.forEach((a, idx) => actorIndexById.set(a.id, idx));

    const colGaps = new Array        (Math.max(0, actors.length - 1)).fill(120);
    for (const msg of messages) {
      const i1 = actorIndexById.get(msg.from) ?? 0;
      const i2 = actorIndexById.get(msg.to) ?? 0;
      const lw =
        this.measurer.measureLineWidth(msg.label, 11, fontSans, 600) + 44;
      if (Math.abs(i2 - i1) === 1) {
        const minIdx = Math.min(i1, i2);
        colGaps[minIdx] = Math.max(colGaps[minIdx], lw);
      }
    }

    const actorCentersX           = [];
    let cursorX = padX + (actorWidths[0] || 96) / 2;
    for (let i = 0; i < actors.length; i++) {
      actorCentersX.push(cursorX);
      if (i < actors.length - 1) {
        cursorX +=
          actorWidths[i] / 2 +
          Math.max(
            colGaps[i],
            (actorWidths[i] + actorWidths[i + 1]) / 2 + 32
          );
      }
    }

    const lastActorHalf =
      actors.length > 0 ? actorWidths[actors.length - 1] / 2 : 60;
    const totalW = Math.max(240, Math.ceil(cursorX + lastActorHalf + padX));
    const width = typeof spec.width === "number" ? spec.width : totalW;
    const timelineStartY = titleBarHeight + padTop + actorBoxH;
    const timelineEndY =
      timelineStartY + Math.max(1, messages.length) * msgRowH + 14;
    const height =
      typeof spec.height === "number"
        ? spec.height
        : timelineEndY + padBottom;

    const decorations                        = [];
    const subAnchors                        = [];

    if (spec.title) {
      decorations.push({
        kind: "rect",
        x: 1,
        y: 1,
        width: width - 2,
        height: titleBarHeight,
        rx: Math.max(0, style.radius - 1),
        fill: this.theme.colors.surface,
      });
      decorations.push({
        kind: "text",
        x: 16,
        y: titleBarHeight / 2 + 4,
        text: spec.title,
        fontFamily: fontSans,
        fontSize: 12,
        fontWeight: 600,
        textColor: style.textColor,
      });
      decorations.push({
        kind: "line",
        x: 0,
        y: titleBarHeight,
        x2: width,
        y2: titleBarHeight,
        stroke: style.stroke,
        strokeWidth: 1,
      });
    }

    // Render actor headers & vertical lifelines
    actors.forEach((actor, idx) => {
      const cx = actorCentersX[idx];
      const aw = actorWidths[idx];
      const ax = cx - aw / 2;
      const ay = titleBarHeight + padTop;
      const aTone = actor.tone || "primary";
      const aPalette = this.theme.colors.tones[aTone];
      const actorAnchorId = `${id}.${actor.id}`;

      subAnchors.push({
        anchorId: actorAnchorId,
        x: ax,
        y: ay,
        width: aw,
        height: actorBoxH,
        highlight: true,
        tone: aTone,
      });

      // Vertical lifeline
      decorations.push({
        kind: "line",
        x: cx,
        y: ay + actorBoxH,
        x2: cx,
        y2: timelineEndY,
        stroke: this.theme.colors.border,
        strokeWidth: 1.25,
        strokeDasharray: "4 4",
      });

      // Actor header card
      decorations.push({
        kind: "rect",
        x: ax,
        y: ay,
        width: aw,
        height: actorBoxH,
        rx: 7,
        fill: aPalette.softBg,
        stroke: aPalette.softBorder,
        strokeWidth: 1.5,
      });

      decorations.push({
        kind: "text",
        x: cx,
        y: actor.sublabel ? ay + 16 : ay + 24,
        text: actor.label,
        fontFamily: fontSans,
        fontSize: 12,
        fontWeight: 600,
        textColor: style.textColor,
        textAnchor: "middle",
      });

      if (actor.sublabel) {
        decorations.push({
          kind: "text",
          x: cx,
          y: ay + 31,
          text: actor.sublabel,
          fontFamily: fontMono,
          fontSize: 10,
          textColor: aPalette.main,
          textAnchor: "middle",
        });
      }
    });

    // Render sequence messages
    messages.forEach((msg, mIdx) => {
      const fromIdx = actorIndexById.get(msg.from) ?? 0;
      const toIdx = actorIndexById.get(msg.to) ?? 0;
      const x1 = actorCentersX[fromIdx] ?? padX;
      const x2 = actorCentersX[toIdx] ?? padX;
      const msgY = timelineStartY + 26 + mIdx * msgRowH;
      const mTone = msg.tone || (msg.type === "reply" ? "neutral" : "primary");
      const mColor =
        mTone === "neutral"
          ? this.theme.colors.textMuted
          : this.theme.colors.tones[mTone].main;
      const msgAnchorId = `${id}.msg_${mIdx + 1}`;

      subAnchors.push({
        anchorId: msgAnchorId,
        x: Math.min(x1, x2),
        y: msgY - 18,
        width: Math.max(40, Math.abs(x2 - x1)),
        height: 28,
        tone: mTone,
      });

      // Activation dots on lifelines
      decorations.push({
        kind: "circle",
        x: x1,
        y: msgY,
        r: 3,
        fill: mColor,
      });

      if (fromIdx === toIdx) {
        // Self-call message loop
        const loopW = 36;
        const loopH = 14;
        decorations.push({
          kind: "line",
          x: x1,
          y: msgY - 4,
          x2: x1 + loopW,
          y2: msgY - 4,
          stroke: mColor,
          strokeWidth: 1.5,
        });
        decorations.push({
          kind: "line",
          x: x1 + loopW,
          y: msgY - 4,
          x2: x1 + loopW,
          y2: msgY + loopH,
          stroke: mColor,
          strokeWidth: 1.5,
        });
        decorations.push({
          kind: "line",
          x: x1 + loopW,
          y: msgY + loopH,
          x2: x1 + 4,
          y2: msgY + loopH,
          stroke: mColor,
          strokeWidth: 1.5,
        });
        decorations.push({
          kind: "text",
          x: x1 + loopW + 8,
          y: msgY + 6,
          text: msg.label,
          fontFamily: fontSans,
          fontSize: 11,
          fontWeight: 600,
          textColor: mColor,
        });
      } else {
        const dir = x2 >= x1 ? 1 : -1;
        const endX = x2 - dir * 5;
        decorations.push({
          kind: "line",
          x: x1,
          y: msgY,
          x2: endX,
          y2: msgY,
          stroke: mColor,
          strokeWidth: 1.6,
          strokeDasharray: msg.type === "reply" ? "5 4" : undefined,
        });
        // Arrowhead chevron lines
        decorations.push({
          kind: "line",
          x: x2 - dir * 8,
          y: msgY - 4,
          x2: x2 - dir * 1,
          y2: msgY,
          stroke: mColor,
          strokeWidth: 1.8,
        });
        decorations.push({
          kind: "line",
          x: x2 - dir * 8,
          y: msgY + 4,
          x2: x2 - dir * 1,
          y2: msgY,
          stroke: mColor,
          strokeWidth: 1.8,
        });

        const midX = (x1 + x2) / 2;
        decorations.push({
          kind: "text",
          x: midX,
          y: msgY - 7,
          text: msg.label,
          fontFamily: fontSans,
          fontSize: 11,
          fontWeight: 600,
          textColor: mColor,
          textAnchor: "middle",
        });
      }
    });

    return {
      id,
      type: "sequence",
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: "rect",
      decorations,
      subAnchors,
      children: [],
    };
  }

          buildPrimitiveShapeNode(spec                 )            {
    const id = spec.id || this.nextId(spec.type);
    const style = resolveNodeStyle(spec.style, this.theme, "soft", "primary");
    const fontSans = this.theme.typography.fontSans;
    const labelW = spec.label
      ? this.measurer.measureLineWidth(spec.label, 13, fontSans, 600)
      : 0;
    const subW = spec.sublabel
      ? this.measurer.measureLineWidth(spec.sublabel, 11, fontSans, 400)
      : 0;

    const minW =
      spec.type === "diamond"
        ? Math.max(labelW, subW) + 56
        : spec.type === "queue"
        ? Math.max(labelW, subW) + 52
        : Math.max(labelW, subW) + 36;
    const width =
      typeof spec.width === "number"
        ? spec.width
        : spec.type === "circle"
        ? Math.max(minW, 76)
        : spec.type === "queue"
        ? Math.max(minW, 136)
        : Math.max(minW, 120);
    const height =
      typeof spec.height === "number"
        ? spec.height
        : spec.type === "circle"
        ? width
        : spec.type === "diamond"
        ? 76
        : spec.type === "cylinder"
        ? spec.sublabel
          ? 82
          : 68
        : spec.sublabel
        ? 64
        : 48;

    const decorations                        = [];
    const textCenterY =
      spec.type === "cylinder" ? height / 2 + 7 : height / 2;
    const textCenterX =
      spec.type === "queue" ? width / 2 - 4 : width / 2;

    if (spec.label) {
      decorations.push({
        kind: "text",
        x: textCenterX,
        y: spec.sublabel ? textCenterY - 2 : textCenterY + 4.5,
        text: spec.label,
        fontFamily: fontSans,
        fontSize: 13,
        fontWeight: 600,
        textColor: style.textColor,
        textAnchor: "middle",
      });
    }
    if (spec.sublabel) {
      decorations.push({
        kind: "text",
        x: textCenterX,
        y: textCenterY + 15,
        text: spec.sublabel,
        fontFamily: fontSans,
        fontSize: 11,
        textColor: style.mutedTextColor,
        textAnchor: "middle",
      });
    }

    return {
      id,
      type: spec.type,
      x: spec.x ?? 0,
      y: spec.y ?? 0,
      width,
      height,
      style,
      shape: spec.type,
      decorations,
      subAnchors: [],
      children: [],
    };
  }

  // ==========================================================================
  // Sibling Layout Engine: Flex / Grid / Topological Relative Placement
  // ==========================================================================

          collectDescendantIds(node           , out             )       {
    out.add(node.id);
    for (const child of node.children) {
      this.collectDescendantIds(child, out);
    }
  }

  /**
   * Computes minimum horizontal and vertical gaps required by connections
   * (especially labeled connections) between any two sibling sets in the current container.
   */
          buildSiblingConnectionGapResolver(
    nodes             ,
    compact         
  )   
                     
                               
                               
                                     
                
    {
    const siblingByDescendant = new Map                ();
    for (const n of nodes) {
      const owned = new Set        ();
      this.collectDescendantIds(n, owned);
      for (const id of owned) {
        siblingByDescendant.set(id, n.id);
      }
    }

                          
                   
                   
                       
                      
     

    const reqs               = [];
    for (const conn of this.connections) {
      const fromBase = conn.from.split("@")[0].split(".")[0].trim();
      const toBase = conn.to.split("@")[0].split(".")[0].trim();
      const sibA = siblingByDescendant.get(fromBase);
      const sibB = siblingByDescendant.get(toBase);
      if (!sibA || !sibB || sibA === sibB) continue;

      const labelW = conn.label
        ? this.measurer.measureLineWidth(
            conn.label,
            11,
            this.theme.typography.fontSans,
            600
          ) + 18
        : 0;

      const horizGap = conn.label ? Math.max(64, Math.ceil(labelW + 44)) : 40;
      const vertGap = conn.label ? (compact ? 56 : 64) : 30;
      reqs.push({ sibA, sibB, horizGap, vertGap });
    }

    return {
      getRequiredGap: (groupA, groupB, axis) => {
        const setA = new Set(groupA);
        const setB = new Set(groupB);
        let maxReq = 0;
        for (const r of reqs) {
          if (
            (setA.has(r.sibA) && setB.has(r.sibB)) ||
            (setA.has(r.sibB) && setB.has(r.sibA))
          ) {
            maxReq = Math.max(
              maxReq,
              axis === "horizontal" ? r.horizGap : r.vertGap
            );
          }
        }
        return maxReq;
      },
    };
  }

          positionSiblings(
    nodes             ,
    specs               ,
    layout              ,
    compact         
  )                                    {
    if (nodes.length === 0) return { width: 0, height: 0 };

    const hasExplicitRelativeOrAbsolute = specs.some(
      (s) => s.place !== undefined || s.x !== undefined || s.y !== undefined
    );

    if (layout.type === "grid") {
      return this.layoutGrid(nodes, layout, compact);
    }

    if (layout.type === "flex" && !hasExplicitRelativeOrAbsolute) {
      return this.layoutFlex(nodes, layout, compact);
    }

    // Topological relative + free placement
    return this.layoutTopologicalRelative(nodes, specs, layout, compact);
  }

          layoutFlex(
    nodes             ,
    layout              ,
    compact         
  )                                    {
    const rawDir = layout.direction || "column";
    const dir = compact && rawDir === "row" ? "column" : rawDir;
    const baseGap = layout.gap ?? 18;
    const align = layout.align || (dir === "row" ? "center" : "stretch");
    const gapResolver = this.buildSiblingConnectionGapResolver(nodes, compact);

    if (dir === "column") {
      const maxW = nodes.reduce((m, n) => Math.max(m, n.width), 0);
      let cursorY = 0;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (align === "stretch") {
          n.width = maxW;
          n.x = 0;
        } else if (align === "center") {
          n.x = (maxW - n.width) / 2;
        } else if (align === "end") {
          n.x = maxW - n.width;
        } else {
          n.x = 0;
        }
        n.y = cursorY;
        const nextNode = nodes[i + 1];
        const stepGap = nextNode
          ? Math.max(
              baseGap,
              gapResolver.getRequiredGap([n.id], [nextNode.id], "vertical")
            )
          : 0;
        cursorY += n.height + stepGap;
      }
      return { width: maxW, height: Math.max(0, cursorY) };
    } else {
      const maxH = nodes.reduce((m, n) => Math.max(m, n.height), 0);
      let cursorX = 0;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (align === "center") {
          n.y = (maxH - n.height) / 2;
        } else if (align === "end") {
          n.y = maxH - n.height;
        } else {
          n.y = 0;
        }
        n.x = cursorX;
        const nextNode = nodes[i + 1];
        const stepGap = nextNode
          ? Math.max(
              baseGap,
              gapResolver.getRequiredGap([n.id], [nextNode.id], "horizontal")
            )
          : 0;
        cursorX += n.width + stepGap;
      }
      return { width: Math.max(0, cursorX), height: maxH };
    }
  }

          layoutGrid(
    nodes             ,
    layout              ,
    compact         
  )                                    {
    const cols = compact ? 1 : Math.max(1, layout.columns || 2);
    const gap = layout.gap ?? 18;
    const rows = Math.ceil(nodes.length / cols);

    const colWidths = new Array        (cols).fill(0);
    const rowHeights = new Array        (rows).fill(0);

    nodes.forEach((n, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      colWidths[c] = Math.max(colWidths[c], n.width);
      rowHeights[r] = Math.max(rowHeights[r], n.height);
    });

    nodes.forEach((n, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      n.x =
        colWidths.slice(0, c).reduce((a, b) => a + b, 0) + c * gap;
      n.y =
        rowHeights.slice(0, r).reduce((a, b) => a + b, 0) + r * gap;
    });

    const totalW =
      colWidths.reduce((a, b) => a + b, 0) + Math.max(0, cols - 1) * gap;
    const totalH =
      rowHeights.reduce((a, b) => a + b, 0) + Math.max(0, rows - 1) * gap;
    return { width: totalW, height: totalH };
  }

          layoutTopologicalRelative(
    nodes             ,
    specs               ,
    layout              ,
    compact         
  )                                    {
    const nodeById = new Map                   ();
    const specById = new Map                     ();

    nodes.forEach((n, i) => {
      nodeById.set(n.id, n);
      specById.set(n.id, specs[i]);
    });

    const gapResolver = this.buildSiblingConnectionGapResolver(nodes, compact);

    // Build column groups (connected via below/above) so horizontal gaps account for
    // connections to any node stacked in the same vertical column (e.g. token_table + svg_dom).
    const colGroupById = new Map                     ();
    for (const n of nodes) {
      colGroupById.set(n.id, new Set([n.id]));
    }
    if (!compact) {
      for (let i = 0; i < nodes.length; i++) {
        const p = specs[i].place;
        const vRef = p?.below || p?.above;
        if (vRef && colGroupById.has(vRef)) {
          const gA = colGroupById.get(nodes[i].id) ;
          const gB = colGroupById.get(vRef) ;
          const merged = new Set        ([...gA, ...gB]);
          for (const id of merged) {
            colGroupById.set(id, merged);
          }
        }
      }
    }

    // Build dependency graph for relative placement
    const inDegree = new Map                ();
    const adj = new Map                  ();
    nodes.forEach((n) => {
      inDegree.set(n.id, 0);
      adj.set(n.id, []);
    });

    const getRefId = (place            )                     => {
      if (!place) return undefined;
      return place.rightOf || place.leftOf || place.below || place.above;
    };

    nodes.forEach((n, idx) => {
      const refId = getRefId(specs[idx].place);
      if (refId && nodeById.has(refId) && refId !== n.id) {
        adj.get(refId) .push(n.id);
        inDegree.set(n.id, (inDegree.get(n.id) || 0) + 1);
      }
    });

    // Kahn's topological sort
    const queue           = [];
    inDegree.forEach((deg, id) => {
      if (deg === 0) queue.push(id);
    });

    const order           = [];
    while (queue.length > 0) {
      const curr = queue.shift() ;
      order.push(curr);
      for (const next of adj.get(curr) || []) {
        inDegree.set(next, inDegree.get(next)  - 1);
        if (inDegree.get(next) === 0) {
          queue.push(next);
        }
      }
    }

    // Add any cycle-Remaining nodes in declaration order
    for (const n of nodes) {
      if (!order.includes(n.id)) order.push(n.id);
    }

    // Pre-compute normalized PlaceSpec and symmetric fan-out offsets for nodes sharing (refId, direction)
    const effPlaceById = new Map                   ();
    const fanGroups = new Map                  ();

    for (const id of order) {
      const spec = specById.get(id) ;
      if (spec.x !== undefined || spec.y !== undefined || !spec.place) continue;
      const rawPlace = spec.place;
      const eff            = compact
        ? {
            ...rawPlace,
            rightOf: undefined,
            leftOf: undefined,
            below: rawPlace.below || rawPlace.rightOf,
            above: rawPlace.above || rawPlace.leftOf,
            gap: rawPlace.gap ? Math.min(rawPlace.gap, 36) : 28,
          }
        : rawPlace;
      effPlaceById.set(id, eff);

      if (!eff.offset) {
        const dirKey = eff.rightOf
          ? `rightOf::${eff.rightOf}`
          : eff.leftOf
          ? `leftOf::${eff.leftOf}`
          : eff.below
          ? `below::${eff.below}`
          : eff.above
          ? `above::${eff.above}`
          : undefined;
        if (dirKey) {
          const list = fanGroups.get(dirKey) || [];
          list.push(id);
          fanGroups.set(dirKey, list);
        }
      }
    }

    const fanOffsetById = new Map                                                          ();
    fanGroups.forEach((groupIds, dirKey) => {
      if (groupIds.length <= 1) return;
      const isHorizDir =
        dirKey.startsWith("rightOf::") || dirKey.startsWith("leftOf::");

      if (isHorizDir) {
        // Stack fan-out siblings vertically and center around ref's vertical midpoint
        let totalH = 0;
        const stepGaps           = [];
        for (let i = 0; i < groupIds.length; i++) {
          const n = nodeById.get(groupIds[i]) ;
          totalH += n.height;
          if (i < groupIds.length - 1) {
            const nextId = groupIds[i + 1];
            const g = Math.max(
              24,
              gapResolver.getRequiredGap([n.id], [nextId], "vertical")
            );
            stepGaps.push(g);
            totalH += g;
          }
        }
        let cursor = -totalH / 2;
        for (let i = 0; i < groupIds.length; i++) {
          const n = nodeById.get(groupIds[i]) ;
          fanOffsetById.set(n.id, {
            axis: "y",
            offsetFromRefCenter: cursor + n.height / 2,
          });
          cursor += n.height + (stepGaps[i] || 0);
        }
      } else if (!compact) {
        // Spread below/above fan-out siblings horizontally and center around ref's horizontal midpoint
        let totalW = 0;
        const stepGaps           = [];
        for (let i = 0; i < groupIds.length; i++) {
          const n = nodeById.get(groupIds[i]) ;
          totalW += n.width;
          if (i < groupIds.length - 1) {
            const nextId = groupIds[i + 1];
            const g = Math.max(
              28,
              gapResolver.getRequiredGap([n.id], [nextId], "horizontal")
            );
            stepGaps.push(g);
            totalW += g;
          }
        }
        let cursor = -totalW / 2;
        for (let i = 0; i < groupIds.length; i++) {
          const n = nodeById.get(groupIds[i]) ;
          fanOffsetById.set(n.id, {
            axis: "x",
            offsetFromRefCenter: cursor + n.width / 2,
          });
          cursor += n.width + (stepGaps[i] || 0);
        }
      }
    });

    let autoFlowCursorX = 0;
    let autoFlowCursorY = 0;
    let prevAutoFlowId                    ;
    const defaultFlowRow =
      !compact && (layout.direction === "row" || layout.type === "free");
    const placedNodes              = [];

    const nodesOverlap = (a           , b           , pad = 20)          =>
      a.x - pad < b.x + b.width &&
      a.x + a.width + pad > b.x &&
      a.y - pad < b.y + b.height &&
      a.y + a.height + pad > b.y;

    for (const id of order) {
      const node = nodeById.get(id) ;
      const spec = specById.get(id) ;
      const place = effPlaceById.get(id);

      if (spec.x !== undefined || spec.y !== undefined) {
        node.x = spec.x ?? 0;
        node.y = spec.y ?? 0;
        placedNodes.push(node);
        continue;
      }

      if (place) {
        const refId = getRefId(place);
        const ref = refId ? nodeById.get(refId) : undefined;
        const baseGap = place.gap ?? 44;
        const align = place.align || "center";
        const [ox, oy] = place.offset || [0, 0];
        const fanOffset = fanOffsetById.get(id);

        if (ref) {
          const isHorizPlace = Boolean(place.rightOf || place.leftOf);
          const groupA = isHorizPlace
            ? colGroupById.get(ref.id) || [ref.id]
            : [ref.id];
          const groupB = isHorizPlace
            ? colGroupById.get(node.id) || [node.id]
            : [node.id];
          const connReqGap = gapResolver.getRequiredGap(
            groupA,
            groupB,
            isHorizPlace ? "horizontal" : "vertical"
          );
          const gap = Math.max(baseGap, connReqGap);

          const computeAlignedY = ()         => {
            if (fanOffset && fanOffset.axis === "y") {
              return (
                ref.y +
                ref.height / 2 +
                fanOffset.offsetFromRefCenter -
                node.height / 2 +
                oy
              );
            }
            return align === "start"
              ? ref.y + oy
              : align === "end"
              ? ref.y + ref.height - node.height + oy
              : ref.y + (ref.height - node.height) / 2 + oy;
          };

          const computeAlignedX = ()         => {
            if (fanOffset && fanOffset.axis === "x") {
              return (
                ref.x +
                ref.width / 2 +
                fanOffset.offsetFromRefCenter -
                node.width / 2 +
                ox
              );
            }
            return align === "start"
              ? ref.x + ox
              : align === "end"
              ? ref.x + ref.width - node.width + ox
              : ref.x + (ref.width - node.width) / 2 + ox;
          };

          if (place.rightOf) {
            node.x = ref.x + ref.width + gap + ox;
            node.y = computeAlignedY();
          } else if (place.leftOf) {
            node.x = ref.x - node.width - gap + ox;
            node.y = computeAlignedY();
          } else if (place.below) {
            node.y = ref.y + ref.height + gap + oy;
            node.x = computeAlignedX();
          } else if (place.above) {
            node.y = ref.y - node.height - gap + oy;
            node.x = computeAlignedX();
          }
        }
      } else {
        // Unpositioned node: flow sequentially
        if (prevAutoFlowId) {
          const prevNode = nodeById.get(prevAutoFlowId) ;
          if (defaultFlowRow) {
            const reqGap = gapResolver.getRequiredGap(
              [prevAutoFlowId],
              [node.id],
              "horizontal"
            );
            autoFlowCursorX =
              prevNode.x + prevNode.width + Math.max(layout.gap ?? 32, reqGap);
          } else {
            const reqGap = gapResolver.getRequiredGap(
              [prevAutoFlowId],
              [node.id],
              "vertical"
            );
            autoFlowCursorY =
              prevNode.y + prevNode.height + Math.max(layout.gap ?? 24, reqGap);
          }
        }
        node.x = autoFlowCursorX;
        node.y = autoFlowCursorY;
        prevAutoFlowId = node.id;
        if (defaultFlowRow) {
          autoFlowCursorX += node.width + (layout.gap ?? 32);
        } else {
          autoFlowCursorY += node.height + (layout.gap ?? 24);
        }
      }

      // AABB collision guard: nudge node if it overlaps any already-placed sibling
      let guardIter = 0;
      while (guardIter < 16) {
        const hit = placedNodes.find((p) => nodesOverlap(node, p, 20));
        if (!hit) break;
        if (place?.above) {
          node.y = hit.y - node.height - 24;
        } else if (place?.leftOf) {
          node.x = hit.x - node.width - 28;
        } else {
          node.y = hit.y + hit.height + 24;
        }
        guardIter++;
      }

      placedNodes.push(node);
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    }

    if (minX !== 0 || minY !== 0) {
      for (const n of nodes) {
        n.x -= minX;
        n.y -= minY;
      }
    }

    return {
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY),
    };
  }
}

// --- src/compiler/edge-router.ts ---
/**
 * Semantic Anchor Resolver & Obstacle-Aware Edge Router
 * Features:
 *  - Port Multiplexing & Crossing-Minimizing Port Ordering
 *  - Exact Geometric Perimeter Projection (Rect, Diamond, Circle, Ellipse)
 *  - Hanan-Grid Dijkstra Obstacle-Avoiding Orthogonal Routing
 *  - Self-Loop Routing (Single-Side & Corner Loops)
 *  - Corridor-Aware Label Placement & Multi-Label / Node Collision Avoidance
 */

function parseEndpoint(raw        )                 {
  const [targetId, anchorPart] = raw.split("@");
  if (!anchorPart) {
    return { targetId: targetId.trim(), ratio: 0.5, explicitRatio: false };
  }
  const [sideStr, pctStr] = anchorPart.split(":");
  let ratio = 0.5;
  let explicitRatio = false;
  if (pctStr && pctStr.endsWith("%")) {
    const val = parseFloat(pctStr);
    if (!Number.isNaN(val)) {
      ratio = Math.max(0.08, Math.min(0.92, val / 100));
      explicitRatio = true;
    }
  }
  const normalizedSide = sideStr.trim().toLowerCase();
  const validSides             = ["top", "bottom", "left", "right", "center"];
  const side = validSides.includes(normalizedSide            )
    ? (normalizedSide            )
    : undefined;

  return {
    targetId: targetId.trim(),
    side,
    ratio,
    explicitRatio,
  };
}

function resolveOuterContainers(
  fromBox             ,
  toBox             ,
  registry                             
)   
                            
                          
                            
                          
  {
  const ownerFromBox =
    fromBox.ownerNodeId && registry[fromBox.ownerNodeId]
      ? registry[fromBox.ownerNodeId]
      : fromBox;
  const ownerToBox =
    toBox.ownerNodeId && registry[toBox.ownerNodeId]
      ? registry[toBox.ownerNodeId]
      : toBox;

  const collectAncestors = (box             )              => {
    const set = new Set        ();
    if (box.ownerNodeId) set.add(box.ownerNodeId);
    let currId = box.parentGroupId;
    while (currId && registry[currId]) {
      set.add(currId);
      currId = registry[currId].parentGroupId;
    }
    return set;
  };

  const fromAncestors = collectAncestors(ownerFromBox);
  const toAncestors = collectAncestors(ownerToBox);

  let outerFromBox = ownerFromBox;
  while (
    outerFromBox.parentGroupId &&
    !toAncestors.has(outerFromBox.parentGroupId) &&
    registry[outerFromBox.parentGroupId]
  ) {
    outerFromBox = registry[outerFromBox.parentGroupId];
  }

  let outerToBox = ownerToBox;
  while (
    outerToBox.parentGroupId &&
    !fromAncestors.has(outerToBox.parentGroupId) &&
    registry[outerToBox.parentGroupId]
  ) {
    outerToBox = registry[outerToBox.parentGroupId];
  }

  return { ownerFromBox, ownerToBox, outerFromBox, outerToBox };
}

function computeCorridorBounds(
  outerFromBox             ,
  outerToBox             
)                 {
  const bounds                 = {};

  if (outerToBox.x >= outerFromBox.x + outerFromBox.width - 1) {
    bounds.horiz = [outerFromBox.x + outerFromBox.width, outerToBox.x];
  } else if (outerFromBox.x >= outerToBox.x + outerToBox.width - 1) {
    bounds.horiz = [outerToBox.x + outerToBox.width, outerFromBox.x];
  }

  if (outerToBox.y >= outerFromBox.y + outerFromBox.height - 1) {
    bounds.vert = [outerFromBox.y + outerFromBox.height, outerToBox.y];
  } else if (outerFromBox.y >= outerToBox.y + outerToBox.height - 1) {
    bounds.vert = [outerToBox.y + outerToBox.height, outerFromBox.y];
  }

  return bounds;
}

function chooseAutoSides(
  fromBox             ,
  toBox             ,
  outerFromBox             ,
  outerToBox             ,
  isSelfLoop         
)                                           {
  if (isSelfLoop) {
    return { fromSide: "right", toSide: "top" };
  }

  const refFrom = outerFromBox !== outerToBox ? outerFromBox : fromBox;
  const refTo = outerFromBox !== outerToBox ? outerToBox : toBox;

  const fromCx = refFrom.x + refFrom.width / 2;
  const fromCy = refFrom.y + refFrom.height / 2;
  const toCx = refTo.x + refTo.width / 2;
  const toCy = refTo.y + refTo.height / 2;

  const dx = toCx - fromCx;
  const dy = toCy - fromCy;

  const horizGap =
    dx > 0
      ? refTo.x - (refFrom.x + refFrom.width)
      : refFrom.x - (refTo.x + refTo.width);
  const vertGap =
    dy > 0
      ? refTo.y - (refFrom.y + refFrom.height)
      : refFrom.y - (refTo.y + refTo.height);

  if (horizGap >= vertGap) {
    return dx >= 0
      ? { fromSide: "right", toSide: "left" }
      : { fromSide: "left", toSide: "right" };
  } else {
    return dy >= 0
      ? { fromSide: "bottom", toSide: "top" }
      : { fromSide: "top", toSide: "bottom" };
  }
}

/**
 * Resolves port coordinate on a box or sub-anchor, projecting interior sub-anchors onto the
 * owner node's outer boundary and snapping to non-rectangular geometric perimeters (diamond, circle, ellipse).
 */
function getProjectedPortPoint(
  box             ,
  ownerBox             ,
  side          ,
  ratio = 0.5,
  isExternalConnection = true
)                   {
  let px        ;
  let py        ;

  const targetBox = isExternalConnection && ownerBox !== box ? ownerBox : box;
  const shape = targetBox.shape || "rect";

  switch (side) {
    case "top": {
      px = box.x + box.width * ratio;
      py = isExternalConnection ? Math.min(box.y, ownerBox.y) : box.y;
      if (shape === "diamond") {
        const u = Math.min(1, Math.abs(2 * ratio - 1));
        py = targetBox.y + (targetBox.height / 2) * u;
      } else if (shape === "circle" || shape === "ellipse") {
        const u = Math.max(-1, Math.min(1, 2 * ratio - 1));
        py =
          targetBox.y +
          targetBox.height / 2 -
          (targetBox.height / 2) * Math.sqrt(Math.max(0, 1 - u * u));
      }
      break;
    }
    case "bottom": {
      px = box.x + box.width * ratio;
      py = isExternalConnection
        ? Math.max(box.y + box.height, ownerBox.y + ownerBox.height)
        : box.y + box.height;
      if (shape === "diamond") {
        const u = Math.min(1, Math.abs(2 * ratio - 1));
        py = targetBox.y + targetBox.height - (targetBox.height / 2) * u;
      } else if (shape === "circle" || shape === "ellipse") {
        const u = Math.max(-1, Math.min(1, 2 * ratio - 1));
        py =
          targetBox.y +
          targetBox.height / 2 +
          (targetBox.height / 2) * Math.sqrt(Math.max(0, 1 - u * u));
      }
      break;
    }
    case "left": {
      px = isExternalConnection ? Math.min(box.x, ownerBox.x) : box.x;
      py = box.y + box.height * ratio;
      if (shape === "diamond") {
        const u = Math.min(1, Math.abs(2 * ratio - 1));
        px = targetBox.x + (targetBox.width / 2) * u;
      } else if (shape === "circle" || shape === "ellipse") {
        const u = Math.max(-1, Math.min(1, 2 * ratio - 1));
        px =
          targetBox.x +
          targetBox.width / 2 -
          (targetBox.width / 2) * Math.sqrt(Math.max(0, 1 - u * u));
      }
      break;
    }
    case "right": {
      px = isExternalConnection
        ? Math.max(box.x + box.width, ownerBox.x + ownerBox.width)
        : box.x + box.width;
      py = box.y + box.height * ratio;
      if (shape === "diamond") {
        const u = Math.min(1, Math.abs(2 * ratio - 1));
        px = targetBox.x + targetBox.width - (targetBox.width / 2) * u;
      } else if (shape === "circle" || shape === "ellipse") {
        const u = Math.max(-1, Math.min(1, 2 * ratio - 1));
        px =
          targetBox.x +
          targetBox.width / 2 +
          (targetBox.width / 2) * Math.sqrt(Math.max(0, 1 - u * u));
      }
      break;
    }
    case "center":
    default:
      px = box.x + box.width / 2;
      py = box.y + box.height / 2;
      break;
  }

  return [px, py];
}

/**
 * Aligns facing ports along the cross-axis when two connected boxes overlap on that axis
 * and neither side is multiplexed or fixed to a non-rectangular vertex.
 */
function alignFacingPorts(
  p1                  ,
  p2                  ,
  fromBox             ,
  toBox             ,
  fromSide          ,
  toSide          ,
  fromFixedRatio         ,
  toFixedRatio         ,
  isFromSubAnchor         ,
  isToSubAnchor         
)       {
  const isOppositeHoriz =
    (fromSide === "right" && toSide === "left") ||
    (fromSide === "left" && toSide === "right");
  const isOppositeVert =
    (fromSide === "bottom" && toSide === "top") ||
    (fromSide === "top" && toSide === "bottom");

  const fixedFrom =
    fromFixedRatio || Boolean(fromBox.shape && fromBox.shape !== "rect");
  const fixedTo =
    toFixedRatio || Boolean(toBox.shape && toBox.shape !== "rect");

  if (isOppositeHoriz) {
    const dy = Math.abs(p1[1] - p2[1]);
    if (dy > 0.5 && dy <= 32) {
      const m1 = isFromSubAnchor
        ? Math.min(4, fromBox.height * 0.2)
        : Math.min(16, fromBox.height * 0.22);
      const m2 = isToSubAnchor
        ? Math.min(4, toBox.height * 0.2)
        : Math.min(16, toBox.height * 0.22);
      const min1 = fixedFrom ? p1[1] : fromBox.y + m1;
      const max1 = fixedFrom ? p1[1] : fromBox.y + fromBox.height - m1;
      const min2 = fixedTo ? p2[1] : toBox.y + m2;
      const max2 = fixedTo ? p2[1] : toBox.y + toBox.height - m2;

      const overlapMin = Math.max(min1, min2);
      const overlapMax = Math.min(max1, max2);
      if (overlapMin <= overlapMax) {
        const preferred =
          (isFromSubAnchor || fixedFrom) && !(isToSubAnchor || fixedTo)
            ? p1[1]
            : (isToSubAnchor || fixedTo) && !(isFromSubAnchor || fixedFrom)
            ? p2[1]
            : (p1[1] + p2[1]) / 2;
        const alignedY = Math.max(overlapMin, Math.min(overlapMax, preferred));
        p1[1] = alignedY;
        p2[1] = alignedY;
      }
    }
  } else if (isOppositeVert) {
    const dx = Math.abs(p1[0] - p2[0]);
    if (dx > 0.5 && dx <= 32) {
      const m1 = isFromSubAnchor
        ? Math.min(6, fromBox.width * 0.2)
        : Math.min(18, fromBox.width * 0.2);
      const m2 = isToSubAnchor
        ? Math.min(6, toBox.width * 0.2)
        : Math.min(18, toBox.width * 0.2);
      const min1 = fixedFrom ? p1[0] : fromBox.x + m1;
      const max1 = fixedFrom ? p1[0] : fromBox.x + fromBox.width - m1;
      const min2 = fixedTo ? p2[0] : toBox.x + m2;
      const max2 = fixedTo ? p2[0] : toBox.x + toBox.width - m2;

      const overlapMin = Math.max(min1, min2);
      const overlapMax = Math.min(max1, max2);
      if (overlapMin <= overlapMax) {
        const preferred =
          (isFromSubAnchor || fixedFrom) && !(isToSubAnchor || fixedTo)
            ? p1[0]
            : (isToSubAnchor || fixedTo) && !(isFromSubAnchor || fixedFrom)
            ? p2[0]
            : (p1[0] + p2[0]) / 2;
        const alignedX = Math.max(overlapMin, Math.min(overlapMax, preferred));
        p1[0] = alignedX;
        p2[0] = alignedX;
      }
    }
  }
}

function getNormalVector(side          )                   {
  switch (side) {
    case "top":
      return [0, -1];
    case "bottom":
      return [0, 1];
    case "left":
      return [-1, 0];
    case "right":
      return [1, 0];
    default:
      return [0, 0];
  }
}

/**
 * Removes duplicate consecutive points and merges collinear intermediate waypoints
 */
function simplifyPolyline(points                    )                     {
  if (points.length <= 1) return points;

  const deduped                     = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = deduped[deduped.length - 1];
    if (
      Math.abs(points[i][0] - prev[0]) > 0.5 ||
      Math.abs(points[i][1] - prev[1]) > 0.5
    ) {
      deduped.push(points[i]);
    }
  }

  if (deduped.length <= 2) return deduped;

  const simplified                     = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i++) {
    const prev = simplified[simplified.length - 1];
    const curr = deduped[i];
    const next = deduped[i + 1];

    const sameX =
      Math.abs(prev[0] - curr[0]) <= 0.5 && Math.abs(curr[0] - next[0]) <= 0.5;
    const sameY =
      Math.abs(prev[1] - curr[1]) <= 0.5 && Math.abs(curr[1] - next[1]) <= 0.5;

    if (sameX || sameY) {
      continue;
    }
    simplified.push(curr);
  }
  simplified.push(deduped[deduped.length - 1]);
  return simplified;
}

/**
 * Converts a polyline of orthogonal points into an SVG path string with rounded corners
 */
function buildRoundedPolylinePath(
  points                    ,
  cornerRadius = 8
)         {
  const pts = simplifyPolyline(points);
  if (pts.length === 0) return "";
  if (pts.length === 1)
    return `M ${Math.round(pts[0][0])} ${Math.round(pts[0][1])}`;

  if (pts.length === 2) {
    return `M ${Math.round(pts[0][0])} ${Math.round(pts[0][1])} L ${Math.round(pts[1][0])} ${Math.round(pts[1][1])}`;
  }

  let d = `M ${Math.round(pts[0][0])} ${Math.round(pts[0][1])}`;

  for (let i = 1; i < pts.length - 1; i++) {
    const pPrev = pts[i - 1];
    const pCurr = pts[i];
    const pNext = pts[i + 1];

    const v1x = pCurr[0] - pPrev[0];
    const v1y = pCurr[1] - pPrev[1];
    const len1 = Math.hypot(v1x, v1y);

    const v2x = pNext[0] - pCurr[0];
    const v2y = pNext[1] - pCurr[1];
    const len2 = Math.hypot(v2x, v2y);

    const r = Math.min(cornerRadius, len1 / 2, len2 / 2);
    if (r < 1) {
      d += ` L ${Math.round(pCurr[0])} ${Math.round(pCurr[1])}`;
      continue;
    }

    const startCornerX = pCurr[0] - (v1x / len1) * r;
    const startCornerY = pCurr[1] - (v1y / len1) * r;
    const endCornerX = pCurr[0] + (v2x / len2) * r;
    const endCornerY = pCurr[1] + (v2y / len2) * r;

    d += ` L ${startCornerX.toFixed(1)} ${startCornerY.toFixed(1)}`;
    d += ` Q ${pCurr[0].toFixed(1)} ${pCurr[1].toFixed(1)} ${endCornerX.toFixed(1)} ${endCornerY.toFixed(1)}`;
  }

  const last = pts[pts.length - 1];
  d += ` L ${Math.round(last[0])} ${Math.round(last[1])}`;
  return d;
}

/**
 * Builds orthogonal waypoints for a self-loop edge (from a node back to itself)
 */
function buildSelfLoopWaypoints(
  p1                  ,
  side1          ,
  p2                  ,
  side2          ,
  ownerBox             ,
  stub = 20
)                     {
  const loopOut = Math.max(28, stub + 8);
  const [n1x, n1y] = getNormalVector(side1);
  const [n2x, n2y] = getNormalVector(side2);

  if (side1 === side2) {
    if (side1 === "right" || side1 === "left") {
      const outX =
        side1 === "right"
          ? ownerBox.x + ownerBox.width + loopOut
          : ownerBox.x - loopOut;
      return simplifyPolyline([p1, [outX, p1[1]], [outX, p2[1]], p2]);
    }
    const outY =
      side1 === "bottom"
        ? ownerBox.y + ownerBox.height + loopOut
        : ownerBox.y - loopOut;
    return simplifyPolyline([p1, [p1[0], outY], [p2[0], outY], p2]);
  }

  const out1                   = [
    side1 === "right"
      ? ownerBox.x + ownerBox.width + loopOut
      : side1 === "left"
      ? ownerBox.x - loopOut
      : p1[0] + n1x * loopOut,
    side1 === "bottom"
      ? ownerBox.y + ownerBox.height + loopOut
      : side1 === "top"
      ? ownerBox.y - loopOut
      : p1[1] + n1y * loopOut,
  ];
  const out2                   = [
    side2 === "right"
      ? ownerBox.x + ownerBox.width + loopOut
      : side2 === "left"
      ? ownerBox.x - loopOut
      : p2[0] + n2x * loopOut,
    side2 === "bottom"
      ? ownerBox.y + ownerBox.height + loopOut
      : side2 === "top"
      ? ownerBox.y - loopOut
      : p2[1] + n2y * loopOut,
  ];

  const isHoriz1 = side1 === "left" || side1 === "right";
  const isHoriz2 = side2 === "left" || side2 === "right";

  if (isHoriz1 !== isHoriz2) {
    const corner                   = isHoriz1
      ? [out1[0], out2[1]]
      : [out2[0], out1[1]];
    return simplifyPolyline([p1, out1, corner, out2, p2]);
  }

  // Opposite sides on same node (e.g. right -> left): loop around top of node
  const topY = ownerBox.y - loopOut;
  return simplifyPolyline([
    p1,
    out1,
    [out1[0], topY],
    [out2[0], topY],
    out2,
    p2,
  ]);
}

function buildOrthogonalWaypoints(
  p1                  ,
  side1          ,
  p2                  ,
  side2          ,
  corridor                ,
  outerFromBox             ,
  outerToBox             ,
  stub = 20,
  corridorOffset = 0
)                     {
  const [n1x, n1y] = getNormalVector(side1);
  const [n2x, n2y] = getNormalVector(side2);

  const s1                   = [p1[0] + n1x * stub, p1[1] + n1y * stub];
  const s2                   = [p2[0] + n2x * stub, p2[1] + n2y * stub];

  const isHoriz1 = side1 === "left" || side1 === "right";
  const isHoriz2 = side2 === "left" || side2 === "right";

  if (isHoriz1 && isHoriz2) {
    if (side1 === "right" && side2 === "right") {
      const maxX =
        Math.max(
          s1[0],
          s2[0],
          outerFromBox.x + outerFromBox.width + stub,
          outerToBox.x + outerToBox.width + stub
        ) + Math.max(0, corridorOffset);
      return simplifyPolyline([p1, [maxX, p1[1]], [maxX, p2[1]], p2]);
    }
    if (side1 === "left" && side2 === "left") {
      const minX =
        Math.min(
          s1[0],
          s2[0],
          outerFromBox.x - stub,
          outerToBox.x - stub
        ) + Math.min(0, corridorOffset);
      return simplifyPolyline([p1, [minX, p1[1]], [minX, p2[1]], p2]);
    }

    const forward =
      (side1 === "right" && side2 === "left" && p2[0] >= p1[0]) ||
      (side1 === "left" && side2 === "right" && p1[0] >= p2[0]);

    if (forward && Math.abs(p1[1] - p2[1]) <= 1) {
      return [p1, p2];
    }

    if (forward) {
      let midX = corridor.horiz
        ? (corridor.horiz[0] + corridor.horiz[1]) / 2 + corridorOffset
        : (s1[0] + s2[0]) / 2 + corridorOffset;
      if (corridor.horiz && corridor.horiz[1] - corridor.horiz[0] > 24) {
        midX = Math.max(
          corridor.horiz[0] + 10,
          Math.min(corridor.horiz[1] - 10, midX)
        );
      }
      return simplifyPolyline([p1, [midX, p1[1]], [midX, p2[1]], p2]);
    }

    // Reverse horizontal connection: step out to s1, route around via midY, step into s2
    const midY =
      (corridor.vert
        ? (corridor.vert[0] + corridor.vert[1]) / 2
        : (p1[1] + p2[1]) / 2) + corridorOffset;
    return simplifyPolyline([
      p1,
      s1,
      [s1[0], midY],
      [s2[0], midY],
      s2,
      p2,
    ]);
  }

  if (!isHoriz1 && !isHoriz2) {
    if (side1 === "bottom" && side2 === "bottom") {
      const maxY =
        Math.max(
          s1[1],
          s2[1],
          outerFromBox.y + outerFromBox.height + stub,
          outerToBox.y + outerToBox.height + stub
        ) + Math.max(0, corridorOffset);
      return simplifyPolyline([p1, [p1[0], maxY], [p2[0], maxY], p2]);
    }
    if (side1 === "top" && side2 === "top") {
      const minY =
        Math.min(
          s1[1],
          s2[1],
          outerFromBox.y - stub,
          outerToBox.y - stub
        ) + Math.min(0, corridorOffset);
      return simplifyPolyline([p1, [p1[0], minY], [p2[0], minY], p2]);
    }

    const forward =
      (side1 === "bottom" && side2 === "top" && p2[1] >= p1[1]) ||
      (side1 === "top" && side2 === "bottom" && p1[1] >= p2[1]);

    if (forward && Math.abs(p1[0] - p2[0]) <= 1) {
      return [p1, p2];
    }

    if (forward) {
      let midY = corridor.vert
        ? (corridor.vert[0] + corridor.vert[1]) / 2 + corridorOffset
        : (s1[1] + s2[1]) / 2 + corridorOffset;
      if (corridor.vert && corridor.vert[1] - corridor.vert[0] > 24) {
        midY = Math.max(
          corridor.vert[0] + 10,
          Math.min(corridor.vert[1] - 10, midY)
        );
      }
      return simplifyPolyline([p1, [p1[0], midY], [p2[0], midY], p2]);
    }

    const midX =
      (corridor.horiz
        ? (corridor.horiz[0] + corridor.horiz[1]) / 2
        : (p1[0] + p2[0]) / 2) + corridorOffset;
    return simplifyPolyline([
      p1,
      s1,
      [midX, s1[1]],
      [midX, s2[1]],
      s2,
      p2,
    ]);
  }

  // Orthogonal L-bends (horizontal -> vertical or vertical -> horizontal)
  if (isHoriz1 && !isHoriz2) {
    const corner                   = [p2[0], p1[1]];
    const validOut = (corner[0] - p1[0]) * n1x >= stub * 0.4;
    const validIn = (corner[1] - p2[1]) * n2y >= stub * 0.4;
    if (validOut && validIn) {
      return simplifyPolyline([p1, corner, p2]);
    }
    return simplifyPolyline([p1, s1, [s1[0], s2[1]], s2, p2]);
  }

  const corner                   = [p1[0], p2[1]];
  const validOut = (corner[1] - p1[1]) * n1y >= stub * 0.4;
  const validIn = (corner[0] - p2[0]) * n2x >= stub * 0.4;
  if (validOut && validIn) {
    return simplifyPolyline([p1, corner, p2]);
  }
  return simplifyPolyline([p1, s1, [s2[0], s1[1]], s2, p2]);
}

// ============================================================================
// Obstacle Detection & Hanan Grid Orthogonal A* / Dijkstra Detour Solver
// ============================================================================

function boxContainsBox(outer             , inner             )          {
  return (
    outer.x <= inner.x + 1 &&
    outer.y <= inner.y + 1 &&
    outer.x + outer.width >= inner.x + inner.width - 1 &&
    outer.y + outer.height >= inner.y + inner.height - 1
  );
}

function buildEdgeObstacles(
  fromOwnerId        ,
  toOwnerId        ,
  ownerFromBox             ,
  ownerToBox             ,
  registry                             
)                                                                  {
  const paddedObstacles                = [];
  const rawObstacles                = [];

  // Shrink endpoint owner boxes by 3px so ports on their perimeter don't collide,
  // while any segment cutting across their interior is rejected.
  const shrink = 3;
  if (ownerFromBox.width > shrink * 2 && ownerFromBox.height > shrink * 2) {
    paddedObstacles.push({
      x: ownerFromBox.x + shrink,
      y: ownerFromBox.y + shrink,
      width: ownerFromBox.width - shrink * 2,
      height: ownerFromBox.height - shrink * 2,
    });
    rawObstacles.push(ownerFromBox);
  }
  if (
    ownerToBox !== ownerFromBox &&
    ownerToBox.width > shrink * 2 &&
    ownerToBox.height > shrink * 2
  ) {
    paddedObstacles.push({
      x: ownerToBox.x + shrink,
      y: ownerToBox.y + shrink,
      width: ownerToBox.width - shrink * 2,
      height: ownerToBox.height - shrink * 2,
    });
    rawObstacles.push(ownerToBox);
  }

  const pad = 8;
  for (const [key, box] of Object.entries(registry)) {
    // Only consider primary node boxes, not sub-anchors
    if (box.ownerNodeId && box.ownerNodeId !== key) continue;
    if (key === fromOwnerId || key === toOwnerId) continue;

    // Skip container groups that enclose either endpoint or child nodes inside either endpoint
    if (
      boxContainsBox(box, ownerFromBox) ||
      boxContainsBox(box, ownerToBox) ||
      boxContainsBox(ownerFromBox, box) ||
      boxContainsBox(ownerToBox, box)
    ) {
      continue;
    }

    rawObstacles.push(box);
    paddedObstacles.push({
      x: box.x - pad,
      y: box.y - pad,
      width: box.width + pad * 2,
      height: box.height + pad * 2,
    });
  }

  return { paddedObstacles, rawObstacles };
}

function segmentIntersectsBox(
  a                  ,
  b                  ,
  box             
)          {
  const minX = Math.min(a[0], b[0]);
  const maxX = Math.max(a[0], b[0]);
  const minY = Math.min(a[1], b[1]);
  const maxY = Math.max(a[1], b[1]);

  const bx1 = box.x;
  const by1 = box.y;
  const bx2 = box.x + box.width;
  const by2 = box.y + box.height;

  // Axis-aligned orthogonal segment fast check
  if (Math.abs(a[1] - b[1]) <= 0.5) {
    const y = a[1];
    return y > by1 && y < by2 && maxX > bx1 && minX < bx2;
  }
  if (Math.abs(a[0] - b[0]) <= 0.5) {
    const x = a[0];
    return x > bx1 && x < bx2 && maxY > by1 && minY < by2;
  }

  // General Liang-Barsky segment-AABB intersection
  if (maxX <= bx1 || minX >= bx2 || maxY <= by1 || minY >= by2) {
    return false;
  }
  let t0 = 0;
  let t1 = 1;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const p = [-dx, dx, -dy, dy];
  const q = [a[0] - bx1, bx2 - a[0], a[1] - by1, by2 - a[1]];

  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-6) {
      if (q[i] <= 0) return false;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return t0 < t1;
}

function polylineHitsObstacles(
  points                    ,
  obstacles               
)          {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    for (const obs of obstacles) {
      if (segmentIntersectsBox(a, b, obs)) {
        return true;
      }
    }
  }
  return false;
}

function pointInsideAnyObstacle(
  pt                  ,
  obstacles               
)          {
  for (const obs of obstacles) {
    if (
      pt[0] > obs.x &&
      pt[0] < obs.x + obs.width &&
      pt[1] > obs.y &&
      pt[1] < obs.y + obs.height
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Finds a minimum-bend, shortest-path orthogonal route from p1 to p2 on a Hanan visibility grid
 * avoiding all intermediate and endpoint obstacle bounding boxes.
 */
function findObstacleFreeOrthogonalPath(
  p1                  ,
  side1          ,
  p2                  ,
  side2          ,
  rawObstacles               ,
  paddedObstacles               ,
  stub = 20
)                            {
  const [n1x, n1y] = getNormalVector(side1);
  const [n2x, n2y] = getNormalVector(side2);

  let s1                   = [p1[0] + n1x * stub, p1[1] + n1y * stub];
  if (
    pointInsideAnyObstacle(s1, paddedObstacles) ||
    polylineHitsObstacles([p1, s1], paddedObstacles)
  ) {
    const shortStub                   = [p1[0] + n1x * 8, p1[1] + n1y * 8];
    s1 = !polylineHitsObstacles([p1, shortStub], paddedObstacles)
      ? shortStub
      : p1;
  }

  let s2                   = [p2[0] + n2x * stub, p2[1] + n2y * stub];
  if (
    pointInsideAnyObstacle(s2, paddedObstacles) ||
    polylineHitsObstacles([s2, p2], paddedObstacles)
  ) {
    const shortStub                   = [p2[0] + n2x * 8, p2[1] + n2y * 8];
    s2 = !polylineHitsObstacles([shortStub, p2], paddedObstacles)
      ? shortStub
      : p2;
  }

  const clearance = 18;
  const xSet = new Set        ([
    Math.round(p1[0]),
    Math.round(p2[0]),
    Math.round(s1[0]),
    Math.round(s2[0]),
    Math.round((s1[0] + s2[0]) / 2),
  ]);
  const ySet = new Set        ([
    Math.round(p1[1]),
    Math.round(p2[1]),
    Math.round(s1[1]),
    Math.round(s2[1]),
    Math.round((s1[1] + s2[1]) / 2),
  ]);

  for (const b of rawObstacles) {
    xSet.add(Math.round(b.x - clearance));
    xSet.add(Math.round(b.x + b.width + clearance));
    ySet.add(Math.round(b.y - clearance));
    ySet.add(Math.round(b.y + b.height + clearance));
  }

  const baseXs = Array.from(xSet).sort((a, b) => a - b);
  const baseYs = Array.from(ySet).sort((a, b) => a - b);
  for (let i = 0; i < baseXs.length - 1; i++) {
    if (baseXs[i + 1] - baseXs[i] > 16) {
      xSet.add(Math.round((baseXs[i] + baseXs[i + 1]) / 2));
    }
  }
  for (let i = 0; i < baseYs.length - 1; i++) {
    if (baseYs[i + 1] - baseYs[i] > 16) {
      ySet.add(Math.round((baseYs[i] + baseYs[i + 1]) / 2));
    }
  }

  // Ensure exact s1 and s2 coordinates are in the grid
  xSet.add(s1[0]);
  xSet.add(s2[0]);
  ySet.add(s1[1]);
  ySet.add(s2[1]);

  const xs = Array.from(xSet).sort((a, b) => a - b);
  const ys = Array.from(ySet).sort((a, b) => a - b);
  const nx = xs.length;
  const ny = ys.length;

  const startXi = xs.indexOf(s1[0]);
  const startYi = ys.indexOf(s1[1]);
  const endXi = xs.indexOf(s2[0]);
  const endYi = ys.indexOf(s2[1]);
  if (startXi < 0 || startYi < 0 || endXi < 0 || endYi < 0) return null;

  // Directions: 0 = horiz, 1 = vert
  const initDir = side1 === "left" || side1 === "right" ? 0 : 1;
  const targetDir = side2 === "left" || side2 === "right" ? 0 : 1;
  const stateCount = nx * ny * 2;
  const dist = new Float64Array(stateCount).fill(Infinity);
  const parent = new Int32Array(stateCount).fill(-1);
  const visited = new Uint8Array(stateCount);

  const encode = (xi        , yi        , dir        ) =>
    (yi * nx + xi) * 2 + dir;

  const startState = encode(startXi, startYi, initDir);
  dist[startState] = 0;

  const bendPenalty = 85;
  const dxs = [1, -1, 0, 0];
  const dys = [0, 0, 1, -1];
  const dirs = [0, 0, 1, 1];

  for (let step = 0; step < stateCount; step++) {
    let u = -1;
    let bestD = Infinity;
    for (let s = 0; s < stateCount; s++) {
      if (!visited[s] && dist[s] < bestD) {
        bestD = dist[s];
        u = s;
      }
    }
    if (u === -1 || bestD === Infinity) break;
    visited[u] = 1;

    const uDir = u & 1;
    const cell = u >> 1;
    const uXi = cell % nx;
    const uYi = (cell / nx) | 0;

    if (uXi === endXi && uYi === endYi) {
      break;
    }

    const ux = xs[uXi];
    const uy = ys[uYi];

    for (let d = 0; d < 4; d++) {
      const vXi = uXi + dxs[d];
      const vYi = uYi + dys[d];
      if (vXi < 0 || vXi >= nx || vYi < 0 || vYi >= ny) continue;

      const vDir = dirs[d];
      const vx = xs[vXi];
      const vy = ys[vYi];

      if (polylineHitsObstacles([[ux, uy], [vx, vy]], paddedObstacles)) {
        continue;
      }

      const segLen = Math.abs(vx - ux) + Math.abs(vy - uy);
      let extraCost = uDir !== vDir ? bendPenalty : 0;
      if (vXi === endXi && vYi === endYi && vDir !== targetDir) {
        extraCost += bendPenalty;
      }

      const vState = encode(vXi, vYi, vDir);
      const nextDist = bestD + segLen + extraCost;
      if (nextDist < dist[vState]) {
        dist[vState] = nextDist;
        parent[vState] = u;
      }
    }
  }

  const endState0 = encode(endXi, endYi, 0);
  const endState1 = encode(endXi, endYi, 1);
  let curr =
    dist[endState0] <= dist[endState1] ? endState0 : endState1;
  if (dist[curr] === Infinity) return null;

  const gridPts                     = [];
  while (curr !== -1) {
    const cell = curr >> 1;
    const xi = cell % nx;
    const yi = (cell / nx) | 0;
    gridPts.push([xs[xi], ys[yi]]);
    curr = parent[curr];
  }
  gridPts.reverse();

  return simplifyPolyline([p1, ...gridPts, p2]);
}

// ============================================================================
// Bezier & Polyline Label Evaluation Helpers
// ============================================================================

function evalCubicBezier(
  p0                  ,
  c1                  ,
  c2                  ,
  p3                  ,
  t        
)                   {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  const w0 = mt2 * mt;
  const w1 = 3 * mt2 * t;
  const w2 = 3 * mt * t2;
  const w3 = t2 * t;
  return [
    w0 * p0[0] + w1 * c1[0] + w2 * c2[0] + w3 * p3[0],
    w0 * p0[1] + w1 * c1[1] + w2 * c2[1] + w3 * p3[1],
  ];
}

function findBezierTForCoord(
  p0                  ,
  c1                  ,
  c2                  ,
  p3                  ,
  targetVal        ,
  axis       
)         {
  const increasing = p3[axis] >= p0[axis];
  let lo = 0.06;
  let hi = 0.94;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    const val = evalCubicBezier(p0, c1, c2, p3, mid)[axis];
    if ((increasing && val < targetVal) || (!increasing && val > targetVal)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

function evalPointAlongPolyline(
  pts                    ,
  ratio        
)                   {
  if (pts.length === 0) return [0, 0];
  if (pts.length === 1) return pts[0];

  const segLens           = [];
  let totalLen = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const len = Math.hypot(
      pts[i + 1][0] - pts[i][0],
      pts[i + 1][1] - pts[i][1]
    );
    segLens.push(len);
    totalLen += len;
  }

  if (totalLen < 1e-3) return pts[0];
  const targetDist = Math.max(0, Math.min(1, ratio)) * totalLen;
  let acc = 0;
  for (let i = 0; i < segLens.length; i++) {
    const segLen = segLens[i];
    if (acc + segLen >= targetDist || i === segLens.length - 1) {
      const localT = segLen > 1e-3 ? (targetDist - acc) / segLen : 0;
      return [
        pts[i][0] + (pts[i + 1][0] - pts[i][0]) * localT,
        pts[i][1] + (pts[i + 1][1] - pts[i][1]) * localT,
      ];
    }
    acc += segLen;
  }
  return pts[pts.length - 1];
}

function findLongestClearSegmentMidpoint(
  pts                    ,
  obstacles               
)                   {
  if (pts.length === 0) return [0, 0];
  if (pts.length === 1) return pts[0];

  let bestMid                   = [
    (pts[0][0] + pts[1][0]) / 2,
    (pts[0][1] + pts[1][1]) / 2,
  ];
  let bestScore = -Infinity;

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const mid                   = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const hitObs = pointInsideAnyObstacle(mid, obstacles);
    // Prefer middle segments of a multi-segment route that are long and clear of obstacles
    const isInteriorSeg = pts.length >= 4 && i > 0 && i < pts.length - 2;
    const score =
      len + (isInteriorSeg ? 35 : 0) - (hitObs ? 1000 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestMid = mid;
    }
  }
  return bestMid;
}

function resolveLabelRatio(
  pos                                 
)                                         {
  if (pos === undefined) return { ratio: 0.5, isExplicit: false };
  if (pos === "start") return { ratio: 0.24, isExplicit: true };
  if (pos === "center") return { ratio: 0.5, isExplicit: true };
  if (pos === "end") return { ratio: 0.76, isExplicit: true };
  if (typeof pos === "number" && !Number.isNaN(pos)) {
    return {
      ratio: Math.max(0.08, Math.min(0.92, pos)),
      isExplicit: true,
    };
  }
  return { ratio: 0.5, isExplicit: false };
}

function boxesOverlap(
  a                                                         ,
  b                                                         ,
  pad = 4
)          {
  return (
    a.x - pad < b.x + b.width &&
    a.x + a.width + pad > b.x &&
    a.y - pad < b.y + b.height &&
    a.y + a.height + pad > b.y
  );
}

// ============================================================================
// Main Connection Routing Pipeline
// ============================================================================

export function routeConnections(
  connections                              ,
  anchorRegistry                             ,
  theme                     ,
  measurer              ,
  compact = false
)              {
  if (!connections || connections.length === 0) return [];

  // Pass 1: Resolve endpoints, containers, sides, and collect port groups for Port Multiplexing
  const prepared                     = [];

  connections.forEach((conn, idx) => {
    const id = conn.id || `edge_${idx + 1}`;
    const fromParsed = parseEndpoint(conn.from);
    const toParsed = parseEndpoint(conn.to);

    const fromBox = anchorRegistry[fromParsed.targetId];
    const toBox = anchorRegistry[toParsed.targetId];
    if (!fromBox || !toBox) {
      return;
    }

    const fromOwnerId = fromBox.ownerNodeId || fromParsed.targetId;
    const toOwnerId = toBox.ownerNodeId || toParsed.targetId;
    const isSelfLoop =
      fromParsed.targetId === toParsed.targetId ||
      (fromOwnerId === toOwnerId && fromBox === toBox);
    const isExternal = fromOwnerId !== toOwnerId;
    const isFromSubAnchor = fromParsed.targetId !== fromOwnerId;
    const isToSubAnchor = toParsed.targetId !== toOwnerId;

    const { ownerFromBox, ownerToBox, outerFromBox, outerToBox } =
      resolveOuterContainers(fromBox, toBox, anchorRegistry);

    const corridor = computeCorridorBounds(outerFromBox, outerToBox);
    const autoSides = chooseAutoSides(
      fromBox,
      toBox,
      outerFromBox,
      outerToBox,
      isSelfLoop
    );

    let fromSide = compact
      ? autoSides.fromSide
      : fromParsed.side || autoSides.fromSide;
    let toSide = compact
      ? autoSides.toSide
      : toParsed.side || autoSides.toSide;

    if (isSelfLoop && !fromParsed.side && toParsed.side) {
      fromSide = toParsed.side === "top" ? "right" : "top";
    } else if (isSelfLoop && fromParsed.side && !toParsed.side) {
      toSide = fromParsed.side;
    }

    prepared.push({
      conn,
      idx,
      id,
      fromParsed,
      toParsed,
      fromBox,
      toBox,
      fromOwnerId,
      toOwnerId,
      isExternal,
      isSelfLoop,
      isFromSubAnchor,
      isToSubAnchor,
      ownerFromBox,
      ownerToBox,
      outerFromBox,
      outerToBox,
      corridor,
      fromSide,
      toSide,
      fromRatio: fromParsed.ratio,
      toRatio: toParsed.ratio,
      fromMultiplexed: false,
      toMultiplexed: false,
      corridorOffset: 0,
    });
  });

  // Pass 1b: Port Multiplexing (distribute edges sharing the same node side & segment)
                           
                           
                       
                      
   

  const portGroups = new Map                         ();
  const makePortKey = (
    ownerId        ,
    box             ,
    side          
  )         => {
    const isHoriz = side === "left" || side === "right";
    const segStart = isHoriz ? Math.round(box.y) : Math.round(box.x);
    const segLen = isHoriz ? Math.round(box.height) : Math.round(box.width);
    return `${ownerId}::${side}::${segStart}_${segLen}`;
  };

  for (const item of prepared) {
    if (!item.fromParsed.explicitRatio && item.fromSide !== "center") {
      const key = makePortKey(item.fromOwnerId, item.fromBox, item.fromSide);
      const isHoriz = item.fromSide === "left" || item.fromSide === "right";
      const otherCoord = isHoriz
        ? item.toBox.y + item.toBox.height / 2
        : item.toBox.x + item.toBox.width / 2;
      const list = portGroups.get(key) || [];
      list.push({ item, end: "from", sortCoord: otherCoord });
      portGroups.set(key, list);
    }

    if (!item.toParsed.explicitRatio && item.toSide !== "center") {
      const key = makePortKey(item.toOwnerId, item.toBox, item.toSide);
      const isHoriz = item.toSide === "left" || item.toSide === "right";
      const otherCoord = isHoriz
        ? item.fromBox.y + item.fromBox.height / 2
        : item.fromBox.x + item.fromBox.width / 2;
      const list = portGroups.get(key) || [];
      list.push({ item, end: "to", sortCoord: otherCoord });
      portGroups.set(key, list);
    }
  }

  portGroups.forEach((entries) => {
    if (entries.length <= 1) return;
    entries.sort((a, b) => {
      if (Math.abs(a.sortCoord - b.sortCoord) > 1) {
        return a.sortCoord - b.sortCoord;
      }
      if (a.item.idx !== b.item.idx) return a.item.idx - b.item.idx;
      return a.end === "from" ? -1 : 1;
    });

    const m = entries.length;
    const span = Math.min(0.64, (m - 1) * 0.22);
    const startRatio = 0.5 - span / 2;
    const step = m > 1 ? span / (m - 1) : 0;

    entries.forEach((entry, i) => {
      const r = startRatio + i * step;
      if (entry.end === "from") {
        entry.item.fromRatio = r;
        entry.item.fromMultiplexed = true;
      } else {
        entry.item.toRatio = r;
        entry.item.toMultiplexed = true;
      }
    });
  });

  // Pass 1c: Parallel Corridor Channel Offsetting (separate multiple Z-bends in the same corridor)
  const corridorGroups = new Map                            ();
  for (const item of prepared) {
    if (item.isSelfLoop || (item.conn.routing && item.conn.routing !== "orthogonal")) {
      continue;
    }
    if (item.corridor.horiz) {
      const k = `H::${Math.round(item.corridor.horiz[0])}_${Math.round(item.corridor.horiz[1])}`;
      const list = corridorGroups.get(k) || [];
      list.push(item);
      corridorGroups.set(k, list);
    } else if (item.corridor.vert) {
      const k = `V::${Math.round(item.corridor.vert[0])}_${Math.round(item.corridor.vert[1])}`;
      const list = corridorGroups.get(k) || [];
      list.push(item);
      corridorGroups.set(k, list);
    }
  }
  corridorGroups.forEach((items) => {
    if (items.length <= 1) return;
    items.forEach((it, i) => {
      it.corridorOffset = (i - (items.length - 1) / 2) * 14;
    });
  });

  // Pass 2: Route paths and place labels
  const edges              = [];
  const placedLabelBoxes         
              
              
                  
                   
     = [];

  for (const item of prepared) {
    const {
      conn,
      id,
      fromParsed,
      toParsed,
      fromBox,
      toBox,
      fromOwnerId,
      toOwnerId,
      isExternal,
      isSelfLoop,
      isFromSubAnchor,
      isToSubAnchor,
      ownerFromBox,
      ownerToBox,
      outerFromBox,
      outerToBox,
      corridor,
      fromSide,
      toSide,
      fromRatio,
      toRatio,
      fromMultiplexed,
      toMultiplexed,
      corridorOffset,
    } = item;

    const p1 = getProjectedPortPoint(
      fromBox,
      ownerFromBox,
      fromSide,
      fromRatio,
      isExternal
    );
    const p2 = getProjectedPortPoint(
      toBox,
      ownerToBox,
      toSide,
      toRatio,
      isExternal
    );

    if (!isSelfLoop) {
      alignFacingPorts(
        p1,
        p2,
        fromBox,
        toBox,
        fromSide,
        toSide,
        fromParsed.explicitRatio || fromMultiplexed,
        toParsed.explicitRatio || toMultiplexed,
        isFromSubAnchor,
        isToSubAnchor
      );
    }

    const routing = conn.routing || "orthogonal";
    const cornerRadius = conn.cornerRadius ?? 8;
    const stub = conn.stub ?? 20;

    const { paddedObstacles, rawObstacles } = buildEdgeObstacles(
      fromOwnerId,
      toOwnerId,
      ownerFromBox,
      ownerToBox,
      anchorRegistry
    );

    let pathD = "";
    let points                     = [p1, p2];
    let bezierControls                                              = null;
    let usedObstacleDetour = false;

    if (isSelfLoop) {
      points = buildSelfLoopWaypoints(
        p1,
        fromSide,
        p2,
        toSide,
        ownerFromBox,
        stub
      );
      pathD = buildRoundedPolylinePath(points, cornerRadius);
    } else if (routing === "straight") {
      pathD = `M ${Math.round(p1[0])} ${Math.round(p1[1])} L ${Math.round(p2[0])} ${Math.round(p2[1])}`;
    } else if (routing === "curved") {
      if (
        (Math.abs(p1[0] - p2[0]) <= 1 || Math.abs(p1[1] - p2[1]) <= 1) &&
        !polylineHitsObstacles([p1, p2], paddedObstacles)
      ) {
        pathD = `M ${Math.round(p1[0])} ${Math.round(p1[1])} L ${Math.round(p2[0])} ${Math.round(p2[1])}`;
        points = [p1, p2];
      } else {
        const [n1x, n1y] = getNormalVector(fromSide);
        const [n2x, n2y] = getNormalVector(toSide);
        const dx = Math.abs(p2[0] - p1[0]);
        const dy = Math.abs(p2[1] - p1[1]);
        const primarySpan =
          (fromSide === "left" || fromSide === "right") &&
          (toSide === "left" || toSide === "right")
            ? dx
            : (fromSide === "top" || fromSide === "bottom") &&
              (toSide === "top" || toSide === "bottom")
            ? dy
            : Math.hypot(dx, dy);
        const controlLen =
          conn.curveOffset ?? Math.max(28, Math.min(120, primarySpan * 0.45));
        const c1                   = [
          p1[0] + n1x * controlLen,
          p1[1] + n1y * controlLen,
        ];
        const c2                   = [
          p2[0] + n2x * controlLen,
          p2[1] + n2y * controlLen,
        ];
        bezierControls = [c1, c2];
        pathD = `M ${Math.round(p1[0])} ${Math.round(p1[1])} C ${Math.round(c1[0])} ${Math.round(c1[1])}, ${Math.round(c2[0])} ${Math.round(c2[1])}, ${Math.round(p2[0])} ${Math.round(p2[1])}`;
        points = [
          p1,
          evalCubicBezier(p1, c1, c2, p2, 0.25),
          evalCubicBezier(p1, c1, c2, p2, 0.5),
          evalCubicBezier(p1, c1, c2, p2, 0.75),
          p2,
        ];
      }
    } else {
      points = buildOrthogonalWaypoints(
        p1,
        fromSide,
        p2,
        toSide,
        corridor,
        outerFromBox,
        outerToBox,
        stub,
        corridorOffset
      );

      if (polylineHitsObstacles(points, paddedObstacles)) {
        const detour = findObstacleFreeOrthogonalPath(
          p1,
          fromSide,
          p2,
          toSide,
          rawObstacles,
          paddedObstacles,
          stub
        );
        if (detour && detour.length >= 2) {
          points = detour;
          usedObstacleDetour = true;
        }
      }

      pathD = buildRoundedPolylinePath(points, cornerRadius);
    }

    const tone = conn.tone || "neutral";
    const stroke =
      tone === "neutral"
        ? theme.colors.textMuted
        : theme.colors.tones[tone].main;

    const strokeWidth =
      conn.strokeWidth === "thin"
        ? 1.25
        : conn.strokeWidth === "thick"
        ? 2.5
        : 1.75;

    const strokeDasharray =
      conn.strokeStyle === "dashed"
        ? "6 4"
        : conn.strokeStyle === "dotted"
        ? "2 4"
        : undefined;

    // Corridor & obstacle-aware label placement
    let labelBox                       ;
    if (conn.label) {
      const labelW =
        Math.ceil(
          measurer.measureLineWidth(
            conn.label,
            11,
            theme.typography.fontSans,
            600
          )
        ) + 18;
      const labelH = 22;
      const { ratio: posRatio, isExplicit: hasExplicitPos } = resolveLabelRatio(
        conn.labelPosition
      );

      let anchorPt                  ;

      if (isSelfLoop) {
        anchorPt = findLongestClearSegmentMidpoint(points, paddedObstacles);
      } else if (usedObstacleDetour && !hasExplicitPos) {
        anchorPt = findLongestClearSegmentMidpoint(points, paddedObstacles);
      } else if (bezierControls) {
        const [c1, c2] = bezierControls;
        if (
          corridor.horiz &&
          corridor.horiz[1] > corridor.horiz[0] + 8 &&
          (fromSide === "left" || fromSide === "right") &&
          (toSide === "left" || toSide === "right")
        ) {
          const leftToRight = p2[0] >= p1[0];
          const r = leftToRight ? posRatio : 1 - posRatio;
          const targetX =
            corridor.horiz[0] + (corridor.horiz[1] - corridor.horiz[0]) * r;
          const t = findBezierTForCoord(p1, c1, c2, p2, targetX, 0);
          anchorPt = evalCubicBezier(p1, c1, c2, p2, t);
        } else if (
          corridor.vert &&
          corridor.vert[1] > corridor.vert[0] + 8 &&
          (fromSide === "top" || fromSide === "bottom") &&
          (toSide === "top" || toSide === "bottom")
        ) {
          const topToBottom = p2[1] >= p1[1];
          const r = topToBottom ? posRatio : 1 - posRatio;
          const targetY =
            corridor.vert[0] + (corridor.vert[1] - corridor.vert[0]) * r;
          const t = findBezierTForCoord(p1, c1, c2, p2, targetY, 1);
          anchorPt = evalCubicBezier(p1, c1, c2, p2, t);
        } else {
          anchorPt = evalCubicBezier(p1, c1, c2, p2, posRatio);
        }
      } else if (points.length === 2) {
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        if (
          corridor.horiz &&
          corridor.horiz[1] > corridor.horiz[0] + 8 &&
          Math.abs(dx) >= Math.abs(dy) &&
          Math.abs(dx) > 1
        ) {
          const leftToRight = dx >= 0;
          const r = leftToRight ? posRatio : 1 - posRatio;
          const targetX =
            corridor.horiz[0] + (corridor.horiz[1] - corridor.horiz[0]) * r;
          const t = Math.max(0.08, Math.min(0.92, (targetX - p1[0]) / dx));
          anchorPt = [p1[0] + dx * t, p1[1] + dy * t];
        } else if (
          corridor.vert &&
          corridor.vert[1] > corridor.vert[0] + 8 &&
          Math.abs(dy) > Math.abs(dx) &&
          Math.abs(dy) > 1
        ) {
          const topToBottom = dy >= 0;
          const r = topToBottom ? posRatio : 1 - posRatio;
          const targetY =
            corridor.vert[0] + (corridor.vert[1] - corridor.vert[0]) * r;
          const t = Math.max(0.08, Math.min(0.92, (targetY - p1[1]) / dy));
          anchorPt = [p1[0] + dx * t, p1[1] + dy * t];
        } else {
          anchorPt = [p1[0] + dx * posRatio, p1[1] + dy * posRatio];
        }
      } else if (points.length === 3 && !hasExplicitPos) {
        const len1 = Math.hypot(
          points[1][0] - points[0][0],
          points[1][1] - points[0][1]
        );
        const len2 = Math.hypot(
          points[2][0] - points[1][0],
          points[2][1] - points[1][1]
        );
        anchorPt =
          len1 >= len2
            ? [
                (points[0][0] + points[1][0]) / 2,
                (points[0][1] + points[1][1]) / 2,
              ]
            : [
                (points[1][0] + points[2][0]) / 2,
                (points[1][1] + points[2][1]) / 2,
              ];
      } else if (points.length === 4 && !hasExplicitPos) {
        anchorPt = [
          (points[1][0] + points[2][0]) / 2,
          (points[1][1] + points[2][1]) / 2,
        ];
      } else {
        anchorPt = evalPointAlongPolyline(points, posRatio);
      }

      let lx = anchorPt[0] - labelW / 2;
      let ly = anchorPt[1] - labelH / 2;

      if (conn.labelSide === "top") {
        ly -= labelH / 2 + 6;
      } else if (conn.labelSide === "bottom") {
        ly += labelH / 2 + 6;
      } else if (conn.labelSide === "left") {
        lx -= labelW / 2 + 6;
      } else if (conn.labelSide === "right") {
        lx += labelW / 2 + 6;
      }

      if (conn.labelOffset) {
        lx += conn.labelOffset[0];
        ly += conn.labelOffset[1];
      } else if (!isSelfLoop && !usedObstacleDetour) {
        if (
          corridor.horiz &&
          (fromSide === "left" || fromSide === "right") &&
          (toSide === "left" || toSide === "right")
        ) {
          const minX = corridor.horiz[0] + 6;
          const maxX = corridor.horiz[1] - labelW - 6;
          if (maxX >= minX) {
            lx = Math.max(minX, Math.min(maxX, lx));
          } else {
            lx = (corridor.horiz[0] + corridor.horiz[1] - labelW) / 2;
          }
        }
        if (
          corridor.vert &&
          (fromSide === "top" || fromSide === "bottom") &&
          (toSide === "top" || toSide === "bottom")
        ) {
          const minY = corridor.vert[0] + 6;
          const maxY = corridor.vert[1] - labelH - 6;
          if (maxY >= minY) {
            ly = Math.max(minY, Math.min(maxY, ly));
          } else {
            ly = (corridor.vert[0] + corridor.vert[1] - labelH) / 2;
          }
        }
      }

      const candidateBox = {
        x: lx,
        y: ly,
        width: labelW,
        height: labelH,
      };

      // Avoid overlapping previously placed edge labels
      for (const prev of placedLabelBoxes) {
        if (boxesOverlap(candidateBox, prev, 4)) {
          if (candidateBox.y >= prev.y) {
            candidateBox.y = prev.y + prev.height + 6;
          } else {
            candidateBox.y = prev.y - candidateBox.height - 6;
          }
        }
      }

      placedLabelBoxes.push(candidateBox);
      labelBox = candidateBox;
    }

    // Animation parsing
    let animType                                              = "none";
    let durationSec = 2.0;

    if (conn.animation === true) {
      animType = "pulse";
    } else if (conn.animation && typeof conn.animation === "object") {
      animType = conn.animation.type || "pulse";
      durationSec =
        conn.animation.speed === "fast"
          ? 1.1
          : conn.animation.speed === "slow"
          ? 3.4
          : 2.0;
    }

    edges.push({
      id,
      from: fromParsed.targetId,
      to: toParsed.targetId,
      fromOwnerId,
      toOwnerId,
      pathD,
      points,
      label: conn.label,
      labelBox,
      tone,
      stroke,
      strokeWidth,
      strokeDasharray,
      startMarker: conn.startMarker || "none",
      endMarker: conn.endMarker || "arrow",
      animation: {
        type: animType,
        durationSec,
      },
    });
  }

  return edges;
}

// --- src/compiler/adjacency-builder.ts ---
/**
 * Builds the bidirectional focus adjacency graph for hover highlighting
 * across nodes, code-block lines, table cells, callouts, and edges.
 */

             
                      
            
            
                           

export function buildFocusAdjacency(
  nodes             ,
  edges             
)                                      {
  const map                                      = {};

  const ensureEntry = (key        )                      => {
    if (!map[key]) {
      map[key] = {
        nodeIds: new Set        (),
        anchorIds: new Set        (),
        edgeIds: new Set        (),
      };
    }
    return map[key];
  };

  const registerNodeTree = (node           ) => {
    const entry = ensureEntry(node.id);
    entry.nodeIds.add(node.id);

    for (const sub of node.subAnchors) {
      const subEntry = ensureEntry(sub.anchorId);
      subEntry.nodeIds.add(node.id);
      subEntry.anchorIds.add(sub.anchorId);
    }

    if (node.calloutTail) {
      const targetId = node.calloutTail.targetId;
      const targetOwner = targetId.split(".")[0];
      entry.nodeIds.add(targetOwner);
      entry.anchorIds.add(targetId);

      const targetEntry = ensureEntry(targetId);
      targetEntry.nodeIds.add(node.id);
      targetEntry.nodeIds.add(targetOwner);
      targetEntry.anchorIds.add(targetId);

      const ownerEntry = ensureEntry(targetOwner);
      ownerEntry.nodeIds.add(node.id);
      ownerEntry.anchorIds.add(targetId);
    }

    for (const child of node.children) {
      registerNodeTree(child);
    }
  };

  for (const n of nodes) {
    registerNodeTree(n);
  }

  for (const edge of edges) {
    const keys = new Set        ([
      edge.id,
      edge.from,
      edge.to,
      edge.fromOwnerId,
      edge.toOwnerId,
    ]);

    for (const key of keys) {
      const entry = ensureEntry(key);
      entry.edgeIds.add(edge.id);
      entry.nodeIds.add(edge.fromOwnerId);
      entry.nodeIds.add(edge.toOwnerId);
      entry.anchorIds.add(edge.from);
      entry.anchorIds.add(edge.to);
    }
  }

  return map;
}

// --- src/compiler/index.ts ---
/**
 * Unified Compiler Entry Point: IllustrationSpec + Theme -> Normalized SceneGraph
 * Includes Dynamic ViewBox Envelope Expansion so detour edges, self-loops, and outer labels
 * are never clipped by the SVG canvas boundary.
 */




function translateNodeTree(
  nodes             ,
  dx        ,
  dy        
)       {
  for (const n of nodes) {
    n.x += dx;
    n.y += dy;
    if (n.children.length > 0) {
      translateNodeTree(n.children, dx, dy);
    }
  }
}

function translateAnchorRegistry(
  registry                             ,
  dx        ,
  dy        
)       {
  for (const box of Object.values(registry)) {
    box.x += dx;
    box.y += dy;
  }
}

function measureEdgesEnvelope(edges             )   
               
               
               
               
  {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const edge of edges) {
    for (const pt of edge.points) {
      minX = Math.min(minX, pt[0]);
      minY = Math.min(minY, pt[1]);
      maxX = Math.max(maxX, pt[0]);
      maxY = Math.max(maxY, pt[1]);
    }
    if (edge.labelBox) {
      minX = Math.min(minX, edge.labelBox.x);
      minY = Math.min(minY, edge.labelBox.y);
      maxX = Math.max(maxX, edge.labelBox.x + edge.labelBox.width);
      maxY = Math.max(maxY, edge.labelBox.y + edge.labelBox.height);
    }
  }

  return { minX, minY, maxX, maxY };
}

export function compileIllustration(
  spec                  ,
  theme                     ,
  options                = {},
  measurer = new TextMeasurer()
)             {
  const compact = options.compactViewport ?? false;
  const layoutSolver = new HybridLayoutSolver(measurer, theme);
  const layoutResult = layoutSolver.solve(spec, options);

  let edges = routeConnections(
    spec.connections,
    layoutResult.anchorRegistry,
    theme,
    measurer,
    compact
  );

  let finalWidth = layoutResult.width;
  let finalHeight = layoutResult.height;

  if (edges.length > 0) {
    const minMargin = 20;
    let env = measureEdgesEnvelope(edges);

    const shiftX =
      Number.isFinite(env.minX) && env.minX < minMargin
        ? Math.ceil(minMargin - env.minX)
        : 0;
    const shiftY =
      Number.isFinite(env.minY) && env.minY < minMargin
        ? Math.ceil(minMargin - env.minY)
        : 0;

    if (shiftX > 0 || shiftY > 0) {
      translateNodeTree(layoutResult.nodes, shiftX, shiftY);
      translateAnchorRegistry(layoutResult.anchorRegistry, shiftX, shiftY);
      finalWidth += shiftX;
      finalHeight += shiftY;
      edges = routeConnections(
        spec.connections,
        layoutResult.anchorRegistry,
        theme,
        measurer,
        compact
      );
      env = measureEdgesEnvelope(edges);
    }

    if (typeof spec.canvas?.width !== "number" && Number.isFinite(env.maxX)) {
      finalWidth = Math.max(finalWidth, Math.ceil(env.maxX + minMargin));
    }
    if (typeof spec.canvas?.height !== "number" && Number.isFinite(env.maxY)) {
      finalHeight = Math.max(finalHeight, Math.ceil(env.maxY + minMargin));
    }
  }

  const adjacency = buildFocusAdjacency(layoutResult.nodes, edges);

  return {
    title: spec.title,
    width: finalWidth,
    height: finalHeight,
    viewBox: [0, 0, finalWidth, finalHeight],
    background: spec.canvas?.background || "dots",
    preset: theme.geometry.preset,
    theme,
    anchorRegistry: layoutResult.anchorRegistry,
    nodes: layoutResult.nodes,
    edges,
    adjacency,
  };
}

// --- src/runtime/svg-dom-renderer.ts ---
/**
 * Reactive SVG Renderer for SceneGraph
 * Supports Clean, Sketch & Blueprint presets, Syntax-Highlighted Code Blocks,
 * Sub-Anchor Focus Highlighting, and Animated Data Flows.
 */

function escapeXml(str        )         {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ICON_PATHS                         = {
  cpu: `<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/>`,
  layers: `<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>`,
  database: `<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>`,
  cloud: `<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>`,
  lock: `<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
  sparkles: `<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>`,
  terminal: `<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>`,
  code: `<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>`,
  server: `<rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>`,
  globe: `<circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`,
  zap: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  shield: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`,
  check: `<polyline points="20 6 9 17 4 12"/>`,
  git: `<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/>`,
  key: `<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>`,
  box: `<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>`,
  activity: `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`,
  "hard-drive": `<line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/>`,
  wifi: `<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>`,
  sliders: `<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>`,
  send: `<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>`,
};

function renderIconSvg(
  name        ,
  x        ,
  y        ,
  size        ,
  strokeColor        
)         {
  const key = name.toLowerCase();
  const inner = ICON_PATHS[key] || ICON_PATHS.cpu;
  const scale = size / 24;
  return `<g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) scale(${scale.toFixed(3)})" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
}

function renderDecoration(
  dec                     ,
  rough         ,
  nodeId        ,
  idx        ,
  roughness        
)         {
  switch (dec.kind) {
    case "rect":
      return `<rect x="${dec.x}" y="${dec.y}" width="${dec.width || 0}" height="${dec.height || 0}" rx="${dec.rx || 0}" fill="${dec.fill || "none"}" stroke="${dec.stroke || "none"}" stroke-width="${dec.strokeWidth || 0}" />`;

    case "code-line":
    case "table-cell":
      return `<rect class="ai-ill-subanchor" data-anchor-id="${escapeXml(dec.anchorId || "")}" x="${dec.x}" y="${dec.y}" width="${dec.width || 0}" height="${dec.height || 0}" rx="${dec.rx || 3}" fill="${dec.fill || "transparent"}" />`;

    case "circle":
      return `<circle cx="${dec.x}" cy="${dec.y}" r="${dec.r || 4}" fill="${dec.fill || "none"}" stroke="${dec.stroke || "none"}" />`;

    case "line": {
      const dashAttr = dec.strokeDasharray
        ? ` stroke-dasharray="${dec.strokeDasharray}"`
        : "";
      if (rough && !dec.strokeDasharray) {
        const d = generateRoughLinePath(
          dec.x,
          dec.y,
          dec.x2 ?? dec.x,
          dec.y2 ?? dec.y,
          `${nodeId}_line_${idx}`,
          roughness * 0.65
        );
        return `<path d="${d}" fill="none" stroke="${dec.stroke || "currentColor"}" stroke-width="${dec.strokeWidth || 1}" />`;
      }
      return `<line x1="${dec.x}" y1="${dec.y}" x2="${dec.x2 ?? dec.x}" y2="${dec.y2 ?? dec.y}" stroke="${dec.stroke || "currentColor"}" stroke-width="${dec.strokeWidth || 1}"${dashAttr} />`;
    }

    case "icon":
      return renderIconSvg(
        dec.iconName || "cpu",
        dec.x,
        dec.y,
        dec.width || 16,
        dec.stroke || "currentColor"
      );

    case "text": {
      if (dec.tokens && dec.tokens.length > 0) {
        const tspans = dec.tokens
          .map((tok) => {
            const fillAttr = tok.color
              ? ` fill="${tok.color}"`
              : "";
            const weightAttr = tok.fontWeight
              ? ` font-weight="${tok.fontWeight}"`
              : "";
            return `<tspan${fillAttr}${weightAttr}>${escapeXml(tok.text)}</tspan>`;
          })
          .join("");
        return `<text xml:space="preserve" x="${dec.x}" y="${dec.y}" fill="${dec.textColor || "currentColor"}" font-family="${escapeXml(dec.fontFamily || "sans-serif")}" font-size="${dec.fontSize || 12}px" font-weight="${dec.fontWeight || 400}" text-anchor="${dec.textAnchor || "start"}">${tspans}</text>`;
      }
      return `<text x="${dec.x}" y="${dec.y}" fill="${dec.textColor || "currentColor"}" font-family="${escapeXml(dec.fontFamily || "sans-serif")}" font-size="${dec.fontSize || 12}px" font-weight="${dec.fontWeight || 400}" text-anchor="${dec.textAnchor || "start"}">${escapeXml(dec.text || "")}</text>`;
    }

    default:
      return "";
  }
}

function renderNodeShape(node           , roughness        )         {
  const { width: w, height: h, style, shape } = node;
  if (shape === "none" || style.variant === "ghost") return "";

  const dashAttr = style.strokeDasharray
    ? ` stroke-dasharray="${style.strokeDasharray}"`
    : "";
  const filterAttr =
    style.elevation === "md"
      ? ` filter="url(#ill-shadow-md)"`
      : style.elevation === "sm"
      ? ` filter="url(#ill-shadow-sm)"`
      : "";

  if (shape === "cylinder") {
    const ry = Math.min(13, Math.max(8, Math.round(h * 0.16)));
    const bodyD = `M 0 ${ry} A ${w / 2} ${ry} 0 0 1 ${w} ${ry} L ${w} ${h - ry} A ${w / 2} ${ry} 0 0 1 0 ${h - ry} Z`;
    const topCapD = `M 0 ${ry} A ${w / 2} ${ry} 0 0 0 ${w} ${ry}`;
    const ring2D =
      h >= 68
        ? `<path d="M 0 ${ry + 8} A ${w / 2} ${ry} 0 0 0 ${w} ${ry + 8}" fill="none" stroke="${style.stroke}" stroke-width="${style.strokeWidth * 0.75}" opacity="0.55" />`
        : "";
    if (style.rough) {
      const topRough = generateRoughEllipseStrokePath(
        w / 2,
        ry,
        w / 2 - 1,
        ry - 1,
        `${node.id}_cyl_top`,
        roughness * 0.85
      );
      const leftRough = generateRoughLinePath(
        1,
        ry,
        1,
        h - ry,
        `${node.id}_cyl_l`,
        roughness * 0.85
      );
      const rightRough = generateRoughLinePath(
        w - 1,
        ry,
        w - 1,
        h - ry,
        `${node.id}_cyl_r`,
        roughness * 0.85
      );
      return `<path d="${bodyD}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dashAttr}${filterAttr} /><path d="${topRough} ${leftRough} ${rightRough}" fill="none" stroke="${style.stroke}" stroke-width="${style.strokeWidth * 0.9}" />${ring2D}`;
    }
    return `<path d="${bodyD}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dashAttr}${filterAttr} /><path d="${topCapD}" fill="none" stroke="${style.stroke}" stroke-width="${style.strokeWidth}" />${ring2D}`;
  }

  if (shape === "queue") {
    const rx = Math.min(13, Math.max(8, Math.round(w * 0.1)));
    const bodyD = `M ${rx} 0 L ${w - rx} 0 A ${rx} ${h / 2} 0 0 1 ${w - rx} ${h} L ${rx} ${h} A ${rx} ${h / 2} 0 0 1 ${rx} 0 Z`;
    const rightCapD = `M ${w - rx} 0 A ${rx} ${h / 2} 0 0 0 ${w - rx} ${h}`;
    return `<path d="${bodyD}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dashAttr}${filterAttr} /><path d="${rightCapD}" fill="none" stroke="${style.stroke}" stroke-width="${style.strokeWidth}" />`;
  }

  if (style.rough) {
    if (shape === "circle" || shape === "ellipse") {
      const d = generateRoughEllipseStrokePath(
        w / 2,
        h / 2,
        w / 2 - 2,
        h / 2 - 2,
        node.id,
        roughness
      );
      return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 2}" ry="${h / 2 - 2}" fill="${style.fill}" stroke="none"${filterAttr} /><path d="${d}" fill="none" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dashAttr} />`;
    }

    if (shape === "diamond") {
      const pts                     = [
        [w / 2, 0],
        [w, h / 2],
        [w / 2, h],
        [0, h / 2],
      ];
      const polyStr = pts.map((p) => `${p[0]},${p[1]}`).join(" ");
      const d = generateRoughPolygonStrokePath(pts, node.id, roughness);
      return `<polygon points="${polyStr}" fill="${style.fill}" stroke="none"${filterAttr} /><path d="${d}" fill="none" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dashAttr} />`;
    }

    if (shape === "polygon" && node.polygonPoints) {
      const polyStr = node.polygonPoints.map((p) => `${p[0]},${p[1]}`).join(" ");
      const d = generateRoughPolygonStrokePath(
        node.polygonPoints,
        node.id,
        roughness
      );
      return `<polygon points="${polyStr}" fill="${style.fill}" stroke="none"${filterAttr} /><path d="${d}" fill="none" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dashAttr} />`;
    }

    // Default rough rect
    const d = generateRoughRectStrokePath(0, 0, w, h, node.id, roughness);
    return `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${Math.min(style.radius, 6)}" fill="${style.fill}" stroke="none"${filterAttr} /><path d="${d}" fill="none" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dashAttr} />`;
  }

  // Clean vector shapes
  if (shape === "circle" || shape === "ellipse") {
    return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dashAttr}${filterAttr} />`;
  }

  if (shape === "diamond") {
    const pts = `${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`;
    return `<polygon points="${pts}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}" stroke-linejoin="round"${dashAttr}${filterAttr} />`;
  }

  if (shape === "polygon" && node.polygonPoints) {
    const pts = node.polygonPoints.map((p) => `${p[0]},${p[1]}`).join(" ");
    return `<polygon points="${pts}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}" stroke-linejoin="round"${dashAttr}${filterAttr} />`;
  }

  if (shape === "path" && node.pathD) {
    return `<path d="${node.pathD}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${dashAttr}${filterAttr} />`;
  }

  return `<rect x="0" y="0" width="${w}" height="${h}" rx="${style.radius}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dashAttr}${filterAttr} />`;
}

function renderCalloutConnector(
  node           ,
  anchorRegistry                             
)         {
  if (!node.calloutTail) return "";
  const targetBox = anchorRegistry[node.calloutTail.targetId];
  if (!targetBox) return "";

  const startX = node.x + node.width / 2;
  const startY =
    node.calloutTail.side === "top"
      ? node.y + node.height
      : node.calloutTail.side === "bottom"
      ? node.y
      : node.y + node.height / 2;

  const endX = targetBox.x + targetBox.width / 2;
  const endY =
    node.calloutTail.side === "top"
      ? targetBox.y
      : node.calloutTail.side === "bottom"
      ? targetBox.y + targetBox.height
      : targetBox.y + targetBox.height / 2;

  return `<g class="ai-ill-callout-link" data-node-id="${escapeXml(node.id)}">
    <line x1="${startX.toFixed(1)}" y1="${startY.toFixed(1)}" x2="${endX.toFixed(1)}" y2="${endY.toFixed(1)}" stroke="${node.style.stroke}" stroke-width="1.5" stroke-dasharray="3 3" />
    <circle cx="${endX.toFixed(1)}" cy="${endY.toFixed(1)}" r="3.5" fill="${node.style.stroke}" />
  </g>`;
}

function renderSceneNodeTree(
  node           ,
  roughness        ,
  anchorRegistry                             
)         {
  const shapeSvg = renderNodeShape(node, roughness);
  const decsSvg = node.decorations
    .map((dec, idx) =>
      renderDecoration(dec, node.style.rough, node.id, idx, roughness)
    )
    .join("");

  // Note: child.x and child.y are already converted to world coordinates in LayoutSolver
  const childrenSvg = node.children
    .map((child) => renderSceneNodeTree(child, roughness, anchorRegistry))
    .join("");

  const calloutLink = renderCalloutConnector(node, anchorRegistry);

  return `${calloutLink}<g class="ai-ill-node" data-node-id="${escapeXml(node.id)}" data-node-type="${node.type}" transform="translate(${node.x.toFixed(1)}, ${node.y.toFixed(1)})" opacity="${node.style.opacity}">
    ${shapeSvg}
    ${decsSvg}
  </g>${childrenSvg}`;
}

function renderEdge(edge           , scene            )         {
  const markerEnd =
    edge.endMarker !== "none"
      ? ` marker-end="url(#ill-marker-${edge.endMarker}-${edge.tone})"`
      : "";
  const markerStart =
    edge.startMarker !== "none"
      ? ` marker-start="url(#ill-marker-${edge.startMarker}-${edge.tone})"`
      : "";

  const isFlowAnim = edge.animation.type === "flow";
  const dashVal = isFlowAnim ? "7 5" : edge.strokeDasharray;
  const dashAttr = dashVal ? ` stroke-dasharray="${dashVal}"` : "";
  const flowClass = isFlowAnim ? " ai-ill-edge-flow" : "";

  let roughCompanionSvg = "";
  if (scene.preset === "sketch" && edge.points.length >= 2) {
    const companionD = generateRoughEdgeCompanionPath(
      edge.points,
      `${edge.id}_rough`,
      scene.theme.geometry.roughness
    );
    if (companionD) {
      roughCompanionSvg = `<path class="ai-ill-edge-rough" d="${companionD}" fill="none" stroke="${edge.stroke}" stroke-width="${(edge.strokeWidth * 0.8).toFixed(2)}" stroke-linecap="round" opacity="0.55"${dashAttr} />`;
    }
  }

  let pulseParticles = "";
  if (
    edge.animation.type === "pulse" ||
    edge.animation.type === "bidirectional"
  ) {
    const dur = `${edge.animation.durationSec}s`;
    pulseParticles += `<circle r="3.8" fill="${edge.stroke}" filter="url(#ill-glow)">
      <animateMotion dur="${dur}" repeatCount="indefinite" path="${edge.pathD}" />
    </circle>`;

    if (edge.animation.type === "bidirectional") {
      pulseParticles += `<circle r="3.2" fill="${edge.stroke}" opacity="0.8">
        <animateMotion dur="${dur}" keyPoints="1;0" keyTimes="0;1" calcMode="linear" repeatCount="indefinite" path="${edge.pathD}" />
      </circle>`;
    }
  }

  let labelSvg = "";
  if (edge.label && edge.labelBox) {
    const lb = edge.labelBox;
    const labelStroke =
      edge.tone === "neutral"
        ? scene.theme.colors.border
        : scene.theme.colors.tones[edge.tone].softBorder;
    const labelRx = scene.preset === "blueprint" ? 3 : 11;
    labelSvg = `<g class="ai-ill-edge-label">
      <rect x="${lb.x.toFixed(1)}" y="${lb.y.toFixed(1)}" width="${lb.width.toFixed(1)}" height="${lb.height.toFixed(1)}" rx="${labelRx}" fill="${scene.theme.colors.surfaceElevated}" stroke="${labelStroke}" stroke-width="1" filter="url(#ill-shadow-sm)" />
      <text x="${(lb.x + lb.width / 2).toFixed(1)}" y="${(lb.y + lb.height / 2 + 3.8).toFixed(1)}" fill="${edge.tone === "neutral" ? scene.theme.colors.textMuted : edge.stroke}" font-family="${escapeXml(scene.theme.typography.fontSans)}" font-size="11px" font-weight="600" text-anchor="middle">${escapeXml(edge.label)}</text>
    </g>`;
  }

  return `<g class="ai-ill-edge" data-edge-id="${escapeXml(edge.id)}" data-from="${escapeXml(edge.from)}" data-to="${escapeXml(edge.to)}">
    <!-- Invisible wider hit target for easy hover -->
    <path d="${edge.pathD}" fill="none" stroke="transparent" stroke-width="14" />
    ${roughCompanionSvg}
    <path class="ai-ill-edge-path${flowClass}" d="${edge.pathD}" fill="none" stroke="${edge.stroke}" stroke-width="${edge.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${dashAttr}${markerStart}${markerEnd} />
    ${pulseParticles}
    ${labelSvg}
  </g>`;
}

export function renderSceneGraphToSvgString(scene            )         {
  const { width, height, theme, background } = scene;
  const tones = Object.keys(theme.colors.tones)                  ;

  const markersSvg = tones
    .map((tone) => {
      const col =
        tone === "neutral"
          ? theme.colors.textMuted
          : theme.colors.tones[tone].main;
      return `
        <marker id="ill-marker-arrow-${tone}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
          <path d="M 1 1.8 L 9 5 L 1 8.2 z" fill="${col}" />
        </marker>
        <marker id="ill-marker-dot-${tone}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5">
          <circle cx="5" cy="5" r="3.5" fill="${col}" />
        </marker>
        <marker id="ill-marker-diamond-${tone}" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="6" markerHeight="6" orient="auto">
          <polygon points="6,1 11,6 6,11 1,6" fill="${col}" />
        </marker>`;
    })
    .join("");

  let bgPatternDef = "";
  let bgRectSvg = "";
  const isBlueprint = scene.preset === "blueprint";
  const effectiveBg = isBlueprint && background === "dots" ? "grid" : background;

  if (effectiveBg !== "transparent") {
    if (effectiveBg === "dots") {
      bgPatternDef = `<pattern id="ill-bg-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.15" fill="${theme.colors.gridDot}" />
      </pattern>`;
      bgRectSvg = `<rect width="${width}" height="${height}" rx="12" fill="${theme.colors.bg}" /><rect width="${width}" height="${height}" rx="12" fill="url(#ill-bg-dots)" />`;
    } else if (effectiveBg === "grid") {
      bgPatternDef = `<pattern id="ill-bg-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M 24 0 L 0 0 0 24" fill="none" stroke="${theme.colors.gridDot}" stroke-width="${isBlueprint ? "0.9" : "0.75"}" />
      </pattern>`;
      const blueprintFrame = isBlueprint
        ? `<rect x="8" y="8" width="${width - 16}" height="${height - 16}" fill="none" stroke="${theme.colors.gridDot}" stroke-width="1" stroke-dasharray="4 4" />`
        : "";
      bgRectSvg = `<rect width="${width}" height="${height}" rx="${isBlueprint ? 4 : 12}" fill="${theme.colors.bg}" /><rect width="${width}" height="${height}" rx="${isBlueprint ? 4 : 12}" fill="url(#ill-bg-grid)" />${blueprintFrame}`;
    } else if (effectiveBg === "surface") {
      bgRectSvg = `<rect width="${width}" height="${height}" rx="12" fill="${theme.colors.surface}" />`;
    }
  }

  const shadowAlpha = theme.mode === "dark" ? 0.45 : 0.08;
  const shadowAlphaMd = theme.mode === "dark" ? 0.6 : 0.14;

  const nodesSvg = scene.nodes
    .map((n) =>
      renderSceneNodeTree(n, theme.geometry.roughness, scene.anchorRegistry)
    )
    .join("\n");

  const edgesSvg = scene.edges.map((e) => renderEdge(e, scene)).join("\n");

  return `<svg class="ai-ill-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" style="max-width: ${width}px; height: auto; display: block; margin: 0 auto;" role="img" aria-label="${escapeXml(scene.title || "Technical Illustration")}">
  ${scene.title ? `<title>${escapeXml(scene.title)}</title>` : ""}
  <defs>
    ${markersSvg}
    ${bgPatternDef}
    <filter id="ill-shadow-sm" x="-10%" y="-10%" width="120%" height="125%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="${shadowAlpha}" />
    </filter>
    <filter id="ill-shadow-md" x="-12%" y="-12%" width="124%" height="130%">
      <feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#000000" flood-opacity="${shadowAlphaMd}" />
    </filter>
    <filter id="ill-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.2" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <style>
    @keyframes ill-dash-march {
      to { stroke-dashoffset: -24; }
    }
    .ai-ill-edge-flow {
      animation: ill-dash-march 0.9s linear infinite;
    }
    .ai-ill-node, .ai-ill-edge, .ai-ill-subanchor, .ai-ill-callout-link {
      transition: opacity 0.18s ease, filter 0.18s ease, stroke-width 0.18s ease;
    }
    .ai-ill-node {
      cursor: pointer;
    }
    .ai-ill-subanchor {
      cursor: pointer;
    }
    .ai-ill-svg.has-focus .ai-ill-node.is-dimmed,
    .ai-ill-svg.has-focus .ai-ill-edge.is-dimmed,
    .ai-ill-svg.has-focus .ai-ill-callout-link.is-dimmed {
      opacity: 0.2;
      filter: grayscale(35%);
    }
    .ai-ill-svg.has-focus .ai-ill-edge.is-active .ai-ill-edge-path {
      stroke-width: 2.8px;
    }
    .ai-ill-svg.has-focus .ai-ill-subanchor.is-active {
      stroke: ${theme.colors.tones.primary.main};
      stroke-width: 1.5px;
    }
  </style>
  <g class="ai-ill-bg-layer">${bgRectSvg}</g>
  <g class="ai-ill-nodes-layer">${nodesSvg}</g>
  <g class="ai-ill-edges-layer">${edgesSvg}</g>
</svg>`;
}

// --- src/runtime/web-component.ts ---
/**
 * <ai-illustration> Standard Web Component Runtime
 * Framework-agnostic CustomElement with ThemeObserver, ResizeObserver,
 * Sub-Anchor Hover Focus Highlighting, and Floating Toolbar (Clean/Sketch, Pan/Zoom, HiDPI PNG Export).
 */





const COMPONENT_STYLES = `
:host {
  display: block;
  position: relative;
  width: 100%;
  margin: 1.25rem 0;
  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.ai-ill-wrapper {
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}
.ai-ill-toolbar {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 6px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  opacity: 0;
  transform: translateY(-2px);
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.ai-ill-wrapper:hover .ai-ill-toolbar,
.ai-ill-toolbar:focus-within {
  opacity: 1;
  transform: translateY(0);
}
.ai-ill-btn {
  appearance: none;
  border: none;
  background: transparent;
  color: #e2e8f0;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: background 0.15s ease, color 0.15s ease;
}
.ai-ill-btn:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}
.ai-ill-btn.is-active {
  background: rgba(59, 130, 246, 0.38);
  color: #93c5fd;
}
.ai-ill-stage {
  width: 100%;
  overflow-x: auto;
}
.ai-ill-error {
  padding: 14px 16px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #ef4444;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  white-space: pre-wrap;
}
/* Fullscreen Modal Lightbox */
.ai-ill-modal {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(8, 12, 20, 0.86);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.ai-ill-modal-header {
  position: absolute;
  top: 18px;
  right: 24px;
  display: flex;
  gap: 8px;
}
.ai-ill-modal-viewport {
  width: 92vw;
  height: 84vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: grab;
}
.ai-ill-modal-viewport:active {
  cursor: grabbing;
}
`;

const BaseHTMLElement                     =
  typeof HTMLElement !== "undefined"
    ? HTMLElement
    : (class {}                                 );

export class AiIllustrationElement extends BaseHTMLElement {
  static get observedAttributes()           {
    return ["spec", "preset", "responsive", "toolbar"];
  }

          shadow            ;
          parsedSpec                          = null;
          parseError                = null;
          currentScene                    = null;
          themeObserver                ;
          resizeObserver                 ;
          measurer = new TextMeasurer();
          overridePreset              ;
          forceCompact          ;
          containerWidth = 900;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }

  get spec()                          {
    return this.parsedSpec;
  }

  set spec(val                                  ) {
    if (typeof val === "string") {
      this.parseSpecString(val);
    } else {
      this.parsedSpec = val;
      this.parseError = null;
    }
    this.render();
  }

  connectedCallback()       {
    this.loadInitialSpecFromDom();

    this.themeObserver = new ThemeObserver(this, () => {
      this.render();
    });
    this.themeObserver.connect();

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          if (w > 0 && Math.abs(w - this.containerWidth) > 12) {
            this.containerWidth = w;
            this.render();
          }
        }
      });
      this.resizeObserver.observe(this);
    }

    this.render();
  }

  disconnectedCallback()       {
    this.themeObserver?.disconnect();
    this.resizeObserver?.disconnect();
  }

  attributeChangedCallback(
    name        ,
    oldVal               ,
    newVal               
  )       {
    if (oldVal === newVal) return;
    if (name === "spec" && newVal) {
      this.parseSpecString(newVal);
    } else if (name === "preset") {
      this.overridePreset = (newVal               ) || undefined;
    }
    if (this.isConnected) {
      this.render();
    }
  }

          loadInitialSpecFromDom()       {
    if (this.parsedSpec) return;

    const attrSpec = this.getAttribute("spec");
    if (attrSpec) {
      this.parseSpecString(attrSpec);
      return;
    }

    const scriptEl = this.querySelector(
      'script[type="application/json"], script[type="application/yaml"]'
    );
    if (scriptEl && scriptEl.textContent) {
      this.parseSpecString(scriptEl.textContent);
      return;
    }

    const rawText = this.textContent?.trim();
    if (rawText) {
      this.parseSpecString(rawText);
    }
  }

          parseSpecString(raw        )       {
    try {
      const obj = parseIllustrationSpecText(raw);
      this.parsedSpec = obj                    ;
      this.parseError = null;
    } catch (err) {
      this.parsedSpec = null;
      this.parseError = (err         ).message;
    }
  }

         render()       {
    if (!this.parsedSpec && !this.parseError) {
      this.loadInitialSpecFromDom();
    }
    if (this.parseError) {
      this.shadow.innerHTML = `<style>${COMPONENT_STYLES}</style>
        <div class="ai-ill-error">Spec Parse Error:\n${this.parseError}</div>`;
      return;
    }
    if (!this.parsedSpec) return;

    const validation = validateIllustrationSpec(this.parsedSpec);
    if (!validation.valid || !validation.spec) {
      this.shadow.innerHTML = `<style>${COMPONENT_STYLES}</style>
        <div class="ai-ill-error">Invalid IllustrationSpec:\n${validation.errors.join("\n")}</div>`;
      return;
    }

    const activePreset =
      this.overridePreset ||
      (this.getAttribute("preset")               ) ||
      validation.spec.style?.preset ||
      undefined;

    const theme = resolveThemeTokens(
      this,
      activePreset,
      validation.spec.style?.roughness
    );

    const responsiveAttr = this.getAttribute("responsive") || "reflow";
    const isCompact =
      this.forceCompact !== undefined
        ? this.forceCompact
        : responsiveAttr === "reflow" && this.containerWidth < 620;

    const scene = compileIllustration(
      validation.spec,
      theme,
      { compactViewport: isCompact },
      this.measurer
    );
    this.currentScene = scene;

    const svgHtml = renderSceneGraphToSvgString(scene);
    const showToolbar = this.getAttribute("toolbar") !== "false";
    const isAltPreset = scene.preset !== "clean";
    const presetLabel =
      scene.preset === "sketch"
        ? "✎ Sketch"
        : scene.preset === "blueprint"
        ? "⊞ Blueprint"
        : "◇ Clean";

    this.shadow.innerHTML = `
      <style>${COMPONENT_STYLES}</style>
      <div class="ai-ill-wrapper" data-mode="${theme.mode}" data-preset="${scene.preset}">
        ${
          showToolbar
            ? `<div class="ai-ill-toolbar" role="toolbar" aria-label="Illustration controls">
                <button class="ai-ill-btn ${isAltPreset ? "is-active" : ""}" data-action="toggle-preset" title="切换扁平 (Clean) / 手绘 (Sketch) / 工程蓝图 (Blueprint) 风格">
                  ${presetLabel}
                </button>
                <button class="ai-ill-btn ${isCompact ? "is-active" : ""}" data-action="toggle-compact" title="切换桌面横向 / 移动端纵向重排">
                  ${isCompact ? "↕ 纵排" : "↔ 横排"}
                </button>
                <button class="ai-ill-btn" data-action="fullscreen" title="全屏缩放预览">
                  ⤢ 预览
                </button>
                <button class="ai-ill-btn" data-action="export-png" title="导出当前主题高清 2x PNG">
                  ⬇ PNG
                </button>
                <button class="ai-ill-btn" data-action="copy-svg" title="复制 SVG 源码">
                  ⧉ SVG
                </button>
              </div>`
            : ""
        }
        <div class="ai-ill-stage">${svgHtml}</div>
      </div>
    `;

    this.bindInteractiveEvents();
  }

          bindInteractiveEvents()       {
    const svgEl = this.shadow.querySelector(".ai-ill-svg")                        ;
    if (!svgEl || !this.currentScene) return;

    const adjacency = this.currentScene.adjacency;

    const applyFocus = (focusKey               ) => {
      const allNodes = svgEl.querySelectorAll             (".ai-ill-node");
      const allEdges = svgEl.querySelectorAll             (".ai-ill-edge");
      const allAnchors =
        svgEl.querySelectorAll            (".ai-ill-subanchor");
      const allCalloutLinks = svgEl.querySelectorAll             (
        ".ai-ill-callout-link"
      );

      if (!focusKey || !adjacency[focusKey]) {
        svgEl.classList.remove("has-focus");
        allNodes.forEach((el) =>
          el.classList.remove("is-active", "is-dimmed")
        );
        allEdges.forEach((el) =>
          el.classList.remove("is-active", "is-dimmed")
        );
        allAnchors.forEach((el) => el.classList.remove("is-active"));
        allCalloutLinks.forEach((el) =>
          el.classList.remove("is-active", "is-dimmed")
        );
        return;
      }

      const activeSet = adjacency[focusKey];
      svgEl.classList.add("has-focus");

      allNodes.forEach((el) => {
        const nid = el.getAttribute("data-node-id") || "";
        if (activeSet.nodeIds.has(nid)) {
          el.classList.add("is-active");
          el.classList.remove("is-dimmed");
        } else {
          el.classList.add("is-dimmed");
          el.classList.remove("is-active");
        }
      });

      allEdges.forEach((el) => {
        const eid = el.getAttribute("data-edge-id") || "";
        if (activeSet.edgeIds.has(eid)) {
          el.classList.add("is-active");
          el.classList.remove("is-dimmed");
        } else {
          el.classList.add("is-dimmed");
          el.classList.remove("is-active");
        }
      });

      allAnchors.forEach((el) => {
        const aid = el.getAttribute("data-anchor-id") || "";
        if (activeSet.anchorIds.has(aid)) {
          el.classList.add("is-active");
        } else {
          el.classList.remove("is-active");
        }
      });

      allCalloutLinks.forEach((el) => {
        const nid = el.getAttribute("data-node-id") || "";
        if (activeSet.nodeIds.has(nid)) {
          el.classList.add("is-active");
          el.classList.remove("is-dimmed");
        } else {
          el.classList.add("is-dimmed");
          el.classList.remove("is-active");
        }
      });
    };

    // Sub-anchor hover takes priority over parent node hover
    svgEl.addEventListener("mouseover", (e) => {
      const target = e.target                  ;
      if (!target) return;

      const subAnchorEl = target.closest("[data-anchor-id]");
      if (subAnchorEl) {
        const aid = subAnchorEl.getAttribute("data-anchor-id");
        if (aid && adjacency[aid] && adjacency[aid].edgeIds.size > 0) {
          applyFocus(aid);
          return;
        }
      }

      const edgeEl = target.closest("[data-edge-id]");
      if (edgeEl) {
        applyFocus(edgeEl.getAttribute("data-edge-id"));
        return;
      }

      const nodeEl = target.closest("[data-node-id]");
      if (nodeEl) {
        const nid = nodeEl.getAttribute("data-node-id");
        if (nid && adjacency[nid] && (adjacency[nid].edgeIds.size > 0 || adjacency[nid].nodeIds.size > 1)) {
          applyFocus(nid);
          return;
        }
      }

      applyFocus(null);
    });

    svgEl.addEventListener("mouseleave", () => {
      applyFocus(null);
    });

    // Toolbar actions
    const toolbar = this.shadow.querySelector(".ai-ill-toolbar");
    toolbar?.addEventListener("click", (e) => {
      const btn = (e.target           ).closest("[data-action]")                      ;
      if (!btn) return;
      const action = btn.getAttribute("data-action");

      if (action === "toggle-preset") {
        const current = this.currentScene?.preset || "clean";
        this.overridePreset =
          current === "clean"
            ? "sketch"
            : current === "sketch"
            ? "blueprint"
            : "clean";
        this.render();
      } else if (action === "toggle-compact") {
        const currentCompact =
          this.forceCompact ?? this.containerWidth < 620;
        this.forceCompact = !currentCompact;
        this.render();
      } else if (action === "fullscreen") {
        this.openFullscreenLightbox();
      } else if (action === "export-png") {
        this.exportCurrentThemePng(btn);
      } else if (action === "copy-svg") {
        this.copyCurrentSvg(btn);
      }
    });
  }

          openFullscreenLightbox()       {
    if (!this.currentScene) return;
    const svgHtml = renderSceneGraphToSvgString(this.currentScene);
    const modal = document.createElement("div");
    modal.className = "ai-ill-modal";
    modal.innerHTML = `
      <div class="ai-ill-modal-header">
        <button class="ai-ill-btn" data-modal-action="reset">100% 重置</button>
        <button class="ai-ill-btn" data-modal-action="close">✕ 关闭 (Esc)</button>
      </div>
      <div class="ai-ill-modal-viewport">
        <div class="ai-ill-modal-canvas" style="transform-origin: center center; transition: transform 0.05s linear; width: min(90vw, ${this.currentScene.width * 1.25}px);">
          ${svgHtml}
        </div>
      </div>
    `;

    let scale = 1;
    let tx = 0;
    let ty = 0;
    let dragging = false;
    let startX = 0;
    let startY = 0;

    const canvasEl = modal.querySelector(".ai-ill-modal-canvas")               ;
    const viewportEl = modal.querySelector(
      ".ai-ill-modal-viewport"
    )               ;

    const updateTransform = () => {
      canvasEl.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    };

    viewportEl.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.12 : 0.9;
        scale = Math.max(0.4, Math.min(4, scale * factor));
        updateTransform();
      },
      { passive: false }
    );

    viewportEl.addEventListener("mousedown", (e) => {
      dragging = true;
      startX = e.clientX - tx;
      startY = e.clientY - ty;
    });

    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      tx = e.clientX - startX;
      ty = e.clientY - startY;
      updateTransform();
    });

    window.addEventListener("mouseup", () => {
      dragging = false;
    });

    modal.addEventListener("click", (e) => {
      const target = e.target               ;
      const act = target.getAttribute("data-modal-action");
      if (act === "close" || target === modal) {
        modal.remove();
      } else if (act === "reset") {
        scale = 1;
        tx = 0;
        ty = 0;
        updateTransform();
      }
    });

    this.shadow.appendChild(modal);
  }

          async copyCurrentSvg(btn             )                {
    if (!this.currentScene) return;
    const svgString = renderSceneGraphToSvgString(this.currentScene);
    try {
      await navigator.clipboard.writeText(svgString);
      const original = btn.textContent;
      btn.textContent = "✓ 已复制";
      setTimeout(() => {
        btn.textContent = original;
      }, 1400);
    } catch {
      // Fallback ignored
    }
  }

          exportCurrentThemePng(btn             )       {
    if (!this.currentScene) return;
    const scene = this.currentScene;
    const svgString = renderSceneGraphToSvgString(scene);
    const scale = 2; // 2x Retina HiDPI export

    const blob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = scene.width * scale;
      canvas.height = scene.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = scene.theme.colors.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        const dlUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement("a");
        a.href = dlUrl;
        a.download = `${(scene.title || "illustration").replace(/\s+/g, "-").toLowerCase()}-${scene.theme.mode}.png`;
        a.click();
        URL.revokeObjectURL(dlUrl);
      }, "image/png");

      const original = btn.textContent;
      btn.textContent = "✓ PNG";
      setTimeout(() => {
        btn.textContent = original;
      }, 1400);
    };

    img.src = url;
  }
}

export function registerAiIllustrationElement(
  tagName = "ai-illustration"
)       {
  if (typeof window !== "undefined" && typeof customElements !== "undefined") {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, AiIllustrationElement);
    }
  }
}

// --- src/integrations/remark-plugin.ts ---
/**
 * Remark / MDX Build-Time Plugin
 * Transforms ```illustration JSON/YAML code blocks into <ai-illustration> custom elements,
 * with built-in YAML/Loose-JSON parsing and SSG pre-rendered inline SVG fallback for Zero-CLS & SEO/RSS.
 */




export function remarkAiIllustration(
  options                              = {}
) {
  const tagName = options.tagName || "ai-illustration";
  const responsive = options.responsive || "reflow";
  const prerenderSvg = options.prerenderSvg ?? true;

  return function transformer(tree           )       {
    const walk = (node           ) => {
      if (!node.children) return;
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (
          child.type === "code" &&
          (child.lang === "illustration" || child.lang === "ai-illustration")
        ) {
          const raw = (child.value || "").trim();
          let parsed         ;

          try {
            if (!raw.startsWith("{") && options.parseYaml) {
              parsed = options.parseYaml(raw);
            } else {
              parsed = parseIllustrationSpecText(raw);
            }
          } catch (err) {
            throw new Error(
              `[remark-ai-illustration] Failed to parse illustration block: ${(err         ).message}`
            );
          }

          const check = validateIllustrationSpec(parsed);
          if (!check.valid || !check.spec) {
            throw new Error(
              `[remark-ai-illustration] Invalid IllustrationSpec:\n${check.errors.join("\n")}`
            );
          }

          const serialized = JSON.stringify(check.spec).replace(
            /<\/script>/gi,
            "<\\/script>"
          );
          const presetAttr = options.defaultPreset
            ? ` preset="${options.defaultPreset}"`
            : "";

          let ssrFallbackHtml = "";
          if (prerenderSvg) {
            const ssrTheme = resolveThemeTokens(
              null,
              options.defaultPreset || check.spec.style?.preset,
              check.spec.style?.roughness
            );
            const ssrScene = compileIllustration(check.spec, ssrTheme, {
              compactViewport: false,
            });
            const ssrSvg = renderSceneGraphToSvgString(ssrScene);
            ssrFallbackHtml = `<div class="ai-ill-ssr-fallback">${ssrSvg}</div>`;
          }

          node.children[i] = {
            type: "html",
            value: `<${tagName}${presetAttr} responsive="${responsive}"><script type="application/json">${serialized}</script>${ssrFallbackHtml}</${tagName}>`,
          };
        } else {
          walk(child);
        }
      }
    };

    walk(tree);
  };
}


// Auto-register <ai-illustration> Web Component
registerAiIllustrationElement();
