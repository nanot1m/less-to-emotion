const less = require("less");
const transformTree = require("less/lib/less/transform-tree");
const changeCase = require("change-case");
const { mapObjIndexed } = require("ramda");
const fs = require("fs");
const path = require("path");

const folder = path.join(__dirname, "test");
process.chdir(folder);

fs.readFile("in.less", { encoding: "utf8" }, async (err, data) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  const jsString = await parse(data);
  console.log(jsString);
});

async function parse(lessStr) {
  const tree = await less.parse(lessStr);
  const transformed = transformTree(tree);
  const variables = transformed.variables();

  const originalValues = mapObjIndexed(
    variable => variable.value.toCSS({}),
    variables
  );
  const patchedVariables = mapObjIndexed(
    (_, key) => `'@${changeCase.camelCase(key)}'`,
    variables
  );

  const patchedTree = await less.parse(lessStr, {
    modifyVars: patchedVariables
  });
  const cssStrings = transformTree(patchedTree).toCSS({});

  const rules = splitRules(cssStrings);
  const ruleObjects = rules.map(toRuleObject);
  const emotionJsString = toEmotion(ruleObjects);
  return emotionJsString;
}

/**
 * @param {string} cssStrings
 * @returns {Array<string>}
 */
function splitRules(cssStrings) {
  const lines = cssStrings
    .split(/\n/)
    .map(x => x.trim())
    .filter(Boolean);

  const rules = [];
  let currentRule = [];

  for (const line of lines) {
    currentRule.push(line);

    if (line === "}") {
      rules.push(currentRule.join("\n"));
      currentRule = [];
    }
  }
  return rules;
}

/**
 * @typedef {Object} RuleType
 * @property {string} selector
 * @property {Array<string>} rules
 * @property {boolean} local
 */

/**
 * @param {string} rule
 * @returns {Array<RuleType>}
 */
function toRuleObject(rule) {
  const selectorRuleRe = /(:?[#.a-z]{1}[a-z_]{1}[\s\S]+?){([\s\S]*?)}/g;
  const match = selectorRuleRe.exec(rule);
  if (!match) {
    throw new TypeError(`Rule ${rule} is not valid`);
  }
  const [, selectorStr, rulesStr] = match;

  let local = false;

  if (selectorStr.startsWith(":local")) {
    local = true;
  }

  const selector = selectorStr.replace(/:local|:global/, "").trim();
  const rules = rulesStr
    .split(/\n/)
    .map(x => x.trim())
    .filter(Boolean);

  return {
    local,
    selector,
    rules
  };
}

/**
 * @typedef {Object<string, RuleType>} RuleMap
 */

/**
 * @param {Array<RuleType>} ruleObjects
 * @returns {string}
 */
function toEmotion(ruleObjects) {
  const localStyles = {};
  const globalStyles = [];

  for (const rule of ruleObjects) {
    if (rule.local) {
      processLocalRule(rule.selector, rule.rules, localStyles);
    } else {
      processGlobalRule(rule.selector, rule.rules, globalStyles);
    }
  }

  return `
import { css, injectGlobal } from 'emotion';

export default function(theme) {

  injectGlobal\`
    ${globalStyles.join("\n")}
  \`

  return {};
};
`;
}

/**
 * @param {string} selector
 * @param {Array<string>} rules
 * @param {Object} localStyles
 */
function processLocalRule(selector, rules, localStyles) {
  const rulesStr = rules.map(patchVariables).join(";\n  ");
  const nestedSelectors = selector.split(/\s/);
}

/**
 * @param {string} selector
 * @param {Array<string>} rules
 * @param {Array<string>} globalStyles
 */
function processGlobalRule(selector, rules, globalStyles) {
  const rulesStr = rules.map(patchVariables).join(";\n  ");
  const styleStr = [`${selector} {`, rulesStr, "};"].join("\n");
  globalStyles.push(styleStr);
}

/**
 * @param {string} rule
 * @returns {string}
 */
function patchVariables(rule) {
  return rule.replace(
    /'@(\w*)'/g,
    (match, variable) => `\`\${theme.${variable}}\``
  );
}
