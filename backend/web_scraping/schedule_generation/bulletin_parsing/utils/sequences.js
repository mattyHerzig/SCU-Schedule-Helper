import fs from "fs";

const catalog = JSON.parse(
  fs.readFileSync("./local_data/full_university_catalog.json")
);

function getPrerequisiteExpression(courseCode) {
  //   console.log(courseCode);
  const course = catalog.courses.find((c) => c.courseCode === courseCode);
  //   console.log(course);
  return course?.prerequisiteCourses || null;
}
// =======================================================
// 1) Strip out @{…} blocks and numeric prefixes (4(…))
// =======================================================
function preprocessRequirementExpr(expr) {
  return (
    expr
      // drop '6@{…}' or similar
      .replace(/\d+@\{[^}]*\}/g, "")
      // drop any leftover {…}
      .replace(/\{[^}]*\}/g, "")
      // drop digit‐prefixes before parens e.g. '4(' → '('
      .replace(/\b\d+(?=\s*\()/g, "")
  );
}

// =======================================================
// 2) Parse &, |, !, parentheses into a small AST
// =======================================================
function parseExpression(str) {
  let i = 0;
  function skipWS() {
    while (i < str.length && /\s/.test(str[i])) i++;
  }
  function peek() {
    return str[i];
  }
  function consume(ch) {
    if (str[i] !== ch) throw new Error(`Expected '${ch}' at ${i}`);
    i++;
  }

  function parseExpr() {
    let node = parseAnd();
    skipWS();
    while (peek() === "|") {
      consume("|");
      skipWS();
      const right = parseAnd();
      node =
        node.type === "or"
          ? { type: "or", children: node.children.concat(right) }
          : { type: "or", children: [node, right] };
      skipWS();
    }
    return node;
  }

  function parseAnd() {
    let node = parseFactor();
    skipWS();
    while (peek() === "&") {
      consume("&");
      skipWS();
      const right = parseFactor();
      node =
        node.type === "and"
          ? { type: "and", children: node.children.concat(right) }
          : { type: "and", children: [node, right] };
      skipWS();
    }
    return node;
  }

  function parseFactor() {
    skipWS();
    if (peek() === "!") {
      consume("!");
      skipWS();
      return { type: "not", child: parseFactor() };
    }
    if (peek() === "(") {
      consume("(");
      skipWS();
      const node = parseExpr();
      skipWS();
      if (peek() !== ")") throw new Error(`Unmatched '(' at ${i}`);
      consume(")");
      return node;
    }
    // otherwise it's a course token
    const start = i;
    while (i < str.length && !/[\s&|!\(\)]/.test(str[i])) i++;
    if (i === start) throw new Error(`Unexpected character at ${i}`);
    const tok = str.slice(start, i);
    return { type: "course", code: tok };
  }

  const ast = parseExpr();
  skipWS();
  if (i < str.length) throw new Error(`Trailing garbage at ${i}`);
  return ast;
}

// =======================================================
// 3) Walk the *requirement* AST, pulling out every
//    non‐negated course code (skip ranges like RSOC100-199)
// =======================================================
function extractCourses(node, negated, set) {
  switch (node.type) {
    case "not":
      extractCourses(node.child, true, set);
      break;
    case "course":
      if (!negated && node.code.indexOf("-") < 0) {
        set.add(node.code);
      }
      break;
    case "and":
    case "or":
      node.children.forEach((ch) => extractCourses(ch, negated, set));
      break;
  }
}

// =======================================================
// 4) Build a small “chain AST” for each prerequisite tree
//    rather than a string.  Types:
//
//    • {type:'course', code}
//    • {type:'chain', from: AST, to: code}
//    • {type:'and', parts: [AST,…]}
//    • {type:'or', parts: [AST,…]}
// =======================================================
function buildChainAst(exprAst) {
  switch (exprAst.type) {
    case "course": {
      const c = exprAst.code;
      const pre = getPrerequisiteExpression(c);
      if (!pre) {
        return { type: "course", code: c };
      }
      // parse that prerequisite expression…
      const cleaned = preprocessRequirementExpr(pre);
      const preAst = parseExpression(cleaned);
      const fromAst = buildChainAst(preAst);
      return { type: "chain", from: fromAst, to: c };
    }
    case "or": {
      // flatten nested ORs
      const parts = [];
      for (const ch of exprAst.children) {
        const sub = buildChainAst(ch);
        if (sub.type === "or") parts.push(...sub.parts);
        else parts.push(sub);
      }
      return { type: "or", parts };
    }
    case "and": {
      // flatten nested ANDs
      const parts = [];
      for (const ch of exprAst.children) {
        const sub = buildChainAst(ch);
        if (sub.type === "and") parts.push(...sub.parts);
        else parts.push(sub);
      }
      return { type: "and", parts };
    }
    case "not":
      // we never build chains under negation
      return { type: "course", code: "__IGNORED__" };
  }
}

// =======================================================
// 5) Prune “course” leaves from any AND‐node if that
//    leaf is already contained in the prereq‐side of
//    one of the chain‐nodes in the same AND.
// =======================================================
function pruneChainAst(ast) {
  switch (ast.type) {
    case "and":
      // first recurse
      ast.parts.forEach(pruneChainAst);
      // collect leaf codes and chain‐nodes
      const leafs = ast.parts.filter((p) => p.type === "course");
      const chains = ast.parts.filter((p) => p.type === "chain");
      // build a set of codes that appear in any chain.from subtree
      const covered = new Set();
      for (const c of chains) {
        collectCodes(c.from, covered);
      }
      // filter out any leaf whose code ∈ covered
      ast.parts = ast.parts.filter((p) => {
        if (p.type === "course" && covered.has(p.code)) {
          return false;
        }
        return true;
      });
      // drop exact‐duplicate subtrees (by stringifying)
      const seen = new Set();
      const uniq = [];
      for (const p of ast.parts) {
        const s = chainAstToString(p);
        if (!seen.has(s)) {
          seen.add(s);
          uniq.push(p);
        }
      }
      ast.parts = uniq;
      break;

    case "or":
      ast.parts.forEach(pruneChainAst);
      break;

    case "chain":
      pruneChainAst(ast.from);
      break;

    case "course":
      // nothing
      break;
  }
}

// helper: collect all course codes in an AST
function collectCodes(ast, outSet) {
  switch (ast.type) {
    case "course":
      outSet.add(ast.code);
      break;
    case "chain":
      collectCodes(ast.from, outSet);
      // we DO NOT add ast.to here, since we only care about prereq side
      break;
    case "and":
    case "or":
      ast.parts.forEach((ch) => collectCodes(ch, outSet));
      break;
  }
}

// =======================================================
// 6) Turn our chain‐AST back into a string
// =======================================================
function chainAstToString(ast) {
  switch (ast.type) {
    case "course":
      return ast.code;
    case "chain": {
      const fromS = chainAstToString(ast.from);
      return `(${fromS} -> ${ast.to})`;
    }
    case "or":
      return "(" + ast.parts.map(chainAstToString).join(" | ") + ")";
    case "and":
      return ast.parts.map(chainAstToString).join(" & ");
  }
}

// =======================================================
// 7) Main entry‐point
// =======================================================
function getCourseSequences(requirementExpr) {
  // strip out @{…}, dept‐counts, numeric prefixes, etc.
  const cleanedReq = preprocessRequirementExpr(requirementExpr);
  // parse the user‐supplied requirement
  const reqAst = parseExpression(cleanedReq);
  // collect all non‐negated courses
  const courseSet = new Set();
  extractCourses(reqAst, false, courseSet);

  const result = [];
  for (const course of courseSet) {
    const pre = getPrerequisiteExpression(course);
    if (!pre) continue;

    // build a chain‐AST for this course’s prereqs
    const preClean = preprocessRequirementExpr(pre);
    const preAst = parseExpression(preClean);
    let chainAst = buildChainAst(preAst);

    // prune out any leaf courses covered by a chain
    pruneChainAst(chainAst);

    // stringify
    const chainStr = chainAstToString(chainAst);
    result.push({
      course,
      prerequisiteExpression: chainStr,
    });
  }

  return result;
}

export function getCourseSequencesGeneral(options) {
  console.log(
    `Used getCourseSequencesGeneral with options: ${JSON.stringify(
      options,
      null,
      2
    )}`
  );
  let fullExpression = "";
  let parts = [];
  if (options.courseExpression) parts.push(options.courseExpression);
  if (options.majors.length > 0)
    parts.push(
      options.majors
        .map(
          (major) =>
            catalog.deptsAndPrograms
              .find((d) => d.majors.find((m) => m.name === major))
              ?.majors.find((m) => m.name === major)
              ?.courseRequirementsExpression
        )
        .join(" & ")
    );
  if (options.minors.length > 0)
    parts.push(
      options.minors.map(
        (minor) =>
          catalog.deptsAndPrograms
            .find((d) => d.minors.find((m) => m.name === minor))
            ?.minors.find((m) => m.name === minor)?.courseRequirementsExpression
      )
    );
  if (options.emphases.length > 0)
    parts.push(
      options.emphases.map(
        (emphasis) =>
          catalog.deptsAndPrograms
            .find((d) => d.emphases.find((e) => e.name === emphasis))
            ?.emphases.find((e) => e.name === emphasis)
            ?.courseRequirementsExpression
      )
    );
  fullExpression = parts.join(" & ");
  return JSON.stringify(getCourseSequences(fullExpression), null, 2);
}

// const req =
//   "(MATH11 & MATH12 & MATH13 & MATH14 & MATH51 & MATH53) & (CSCI10 & CSCI60 & CSCI61 & CSCI62) & 1(PHYS31 | CHEM11 | ENVS21 | ENVS23) & (CSEN20 & CSEN20L & CSEN21 & CSEN21L & MATH122 & CSCI161 & CSCI163 & CSEN177 & CSEN177L)";
// const sequences = getCourseSequencesGeneral({
//   majors: ["Economics"],
//   minors: [],
//   emphases: [],
//   courseExpression: "",
// });
// getCourseSequences(req);
// console.log(JSON.stringify(sequences, null, 2));
