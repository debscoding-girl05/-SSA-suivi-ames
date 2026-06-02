const path = require("path");
const dotenv = require("dotenv");
const { Client } = require("@notionhq/client");

// Load local env first, then fallback to repo root env.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
if (!process.env.NOTION_TOKEN) {
  dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
}

const REQUIRED = ["NOTION_TOKEN", "NOTION_DATABASE_ID"];
for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID;
const titleProp = process.env.NOTION_TITLE_PROPERTY || "";
const statusProp = process.env.NOTION_STATUS_PROPERTY || "Status";
const dueProp = process.env.NOTION_DUE_DATE_PROPERTY || "";
const roleProp = process.env.NOTION_ROLE_PROPERTY || "Role";
const assigneeProp = process.env.NOTION_ASSIGNEE_PROPERTY || "Assignee";
const roleValue = process.env.NOTION_ROLE || "";
const userId = process.env.NOTION_USER_ID || "";
const roleValues = roleValue
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const retryAttempts = Number(process.env.NOTION_RETRY_ATTEMPTS || 3);
const retryBaseDelayMs = Number(process.env.NOTION_RETRY_BASE_DELAY_MS || 700);

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
    } else {
      flags[key] = next;
      i += 1;
    }
  }
  return flags;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  const status = error?.status;

  if (status === 408 || status === 429) return true;
  if (typeof status === "number" && status >= 500) return true;
  if (message.includes("timeout") || message.includes("timed out")) return true;
  if (message.includes("connecttimeouterror") || message.includes("network")) return true;
  if (code === "etimedout" || code === "econnreset" || code === "eai_again") return true;

  return false;
}

async function withRetry(fn, operationName) {
  let lastError;

  for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt === retryAttempts) {
        throw error;
      }

      const delay = retryBaseDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `[retry ${attempt}/${retryAttempts}] ${operationName} failed (${error?.message || "error"}). Retrying in ${delay}ms...`
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

function getProperty(page, propertyName) {
  return page.properties?.[propertyName];
}

function richTextToString(value) {
  if (!Array.isArray(value)) return "";
  return value.map((item) => item?.plain_text || "").join("").trim();
}

function getTitle(page) {
  if (titleProp) {
    const prop = getProperty(page, titleProp);
    if (prop?.type === "title") return richTextToString(prop.title);
  }

  for (const prop of Object.values(page.properties || {})) {
    if (prop?.type === "title") return richTextToString(prop.title);
  }

  return "Sans titre";
}

function getStatus(page) {
  const prop = getProperty(page, statusProp);
  if (!prop) return "-";
  if (prop.type === "status") return prop.status?.name || "-";
  if (prop.type === "select") return prop.select?.name || "-";
  return "-";
}

function getDueDate(page) {
  if (!dueProp) return "-";
  const prop = getProperty(page, dueProp);
  if (!prop || prop.type !== "date") return "-";
  return prop.date?.start || "-";
}

function getRole(page) {
  const prop = getProperty(page, roleProp);
  if (!prop) return "-";
  if (prop.type === "select") return prop.select?.name || "-";
  if (prop.type === "multi_select") {
    return prop.multi_select.map((item) => item.name).join(", ") || "-";
  }
  if (prop.type === "rich_text") return richTextToString(prop.rich_text) || "-";
  return "-";
}

function getAssignees(page) {
  const prop = getProperty(page, assigneeProp);
  if (!prop || prop.type !== "people") return "-";
  const names = prop.people.map((person) => person.name || person.id);
  return names.join(", ") || "-";
}

function printTasks(tasks) {
  if (!tasks.length) {
    console.log("Aucune tache trouvee.");
    return;
  }

  for (const page of tasks) {
    const shortId = page.id.slice(0, 8);
    console.log(`- [${shortId}] ${getTitle(page)}`);
    console.log(`  Status: ${getStatus(page)} | Due: ${getDueDate(page)} | Role: ${getRole(page)} | Assignee: ${getAssignees(page)}`);
  }
}

function buildMineFilter() {
  const filters = [];

  if (roleValues.length === 1) {
    filters.push({
      property: roleProp,
      select: { equals: roleValues[0] },
    });
  }

  if (roleValues.length > 1) {
    filters.push({
      or: roleValues.map((value) => ({
        property: roleProp,
        select: { equals: value },
      })),
    });
  }

  if (userId) {
    filters.push({
      property: assigneeProp,
      people: { contains: userId },
    });
  }

  if (!filters.length) return null;
  if (filters.length === 1) return filters[0];
  return { or: filters };
}

async function queryAllPages(filter) {
  const results = [];
  let cursor = undefined;

  do {
    const payload = {
      start_cursor: cursor,
      page_size: 100,
      filter: filter || undefined,
    };

    if (dueProp) {
      payload.sorts = [
        {
          property: dueProp,
          direction: "ascending",
        },
      ];
    }

    const executeQuery = async (queryPayload) => {
      if (notion.databases && typeof notion.databases.query === "function") {
        return withRetry(
          () =>
            notion.databases.query({
              database_id: databaseId,
              ...queryPayload,
            }),
          "notion.databases.query"
        );
      }

      if (notion.dataSources && typeof notion.dataSources.query === "function") {
        return withRetry(
          () =>
            notion.dataSources.query({
              data_source_id: databaseId,
              ...queryPayload,
            }),
          "notion.dataSources.query"
        );
      }

      throw new Error("Unsupported Notion SDK version: no query API found.");
    };

    let response;
    try {
      response = await executeQuery(payload);
    } catch (error) {
      const message = error?.body?.message || error?.message || "";
      if (message.includes("Could not find sort property") && payload.sorts) {
        const noSortPayload = { ...payload };
        delete noSortPayload.sorts;
        response = await executeQuery(noSortPayload);
      } else {
        throw error;
      }
    }

    results.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return results;
}

async function runMine() {
  const mineFilter = buildMineFilter();

  if (!mineFilter) {
    console.log("NOTION_ROLE ou NOTION_USER_ID non configure. Affichage de toutes les taches.");
  }

  const tasks = await queryAllPages(mineFilter);
  printTasks(tasks);
}

async function runToday() {
  if (!dueProp) {
    console.error("NOTION_DUE_DATE_PROPERTY is not configured. Set it in .env to use tasks:today.");
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const baseFilter = buildMineFilter();
  const todayFilter = {
    property: dueProp,
    date: { on_or_before: today },
  };

  const combined = baseFilter ? { and: [baseFilter, todayFilter] } : todayFilter;
  const tasks = await queryAllPages(combined);
  printTasks(tasks);
}

async function runUpdate(flags) {
  const pageId = flags.id;
  const nextStatus = flags.status;

  if (!pageId || !nextStatus) {
    console.error("Usage: npm run tasks:update -- --id <page_id> --status <new_status>");
    process.exit(1);
  }

  const page = await withRetry(
    () => notion.pages.retrieve({ page_id: pageId }),
    "notion.pages.retrieve"
  );
  const statusProperty = page.properties?.[statusProp];

  if (!statusProperty) {
    console.error(`Property not found on page: ${statusProp}`);
    process.exit(1);
  }

  let payload;
  if (statusProperty.type === "status") {
    payload = { status: { name: nextStatus } };
  } else if (statusProperty.type === "select") {
    payload = { select: { name: nextStatus } };
  } else {
    console.error(`Property ${statusProp} must be type status or select.`);
    process.exit(1);
  }

  await withRetry(
    () =>
      notion.pages.update({
        page_id: pageId,
        properties: {
          [statusProp]: payload,
        },
      }),
    "notion.pages.update"
  );

  console.log(`Task ${pageId} updated: ${statusProp} -> ${nextStatus}`);
}

function printHelp() {
  console.log("Notion task CLI");
  console.log("");
  console.log("Commands:");
  console.log("  npm run tasks:mine");
  console.log("  npm run tasks:today");
  console.log("  npm run tasks:update -- --id <page_id> --status <new_status>");
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const flags = parseFlags(rest);

  try {
    if (command === "mine") return runMine();
    if (command === "today") return runToday();
    if (command === "update") return runUpdate(flags);
    return printHelp();
  } catch (error) {
    const message = error?.body?.message || error?.message || "Unknown Notion error";
    console.error(`Notion error: ${message}`);
    process.exit(1);
  }
}

main();
