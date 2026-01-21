import type { Icon } from "../types/icon";

type IconifyCollectionResponse = {
  prefix: string;
  name: string;
  total: number;
  author?: { name?: string };
  license?: { title?: string };
};

type IconifyCollectionIconsResponse = {
  prefix?: string;
  uncategorized?: string[];
  categories?: Record<string, string[]>;
};

type IconifySearchResponse = {
  icons?: unknown;
  total?: number;
  limit?: number;
  start?: number;
};

const getIconifyApiBase = () => {
  const env =
    typeof process !== "undefined" && process.env ? process.env : undefined;
  return (
    env?.NEXT_PUBLIC_ICONIFY_API_BASE ??
    env?.ICONIFY_API_BASE ??
    "https://api.iconify.design"
  );
};

export const ICONIFY_API_BASE = getIconifyApiBase();

export const parseIconifyId = (full: string) => {
  const idx = full.indexOf(":");
  if (idx <= 0 || idx >= full.length - 1) return null;
  const prefix = full.slice(0, idx).trim();
  const name = full.slice(idx + 1).trim();
  if (!prefix || !name) return null;
  return { prefix, name };
};

export const toInternalIconId = (prefix: string, name: string) =>
  `${prefix}__${name}`;

export const iconifySearch = async (params: {
  query: string;
  prefix?: string;
  limit?: number;
  offset?: number;
}) => {
  const url = new URL(`${ICONIFY_API_BASE}/search`);
  url.searchParams.set("query", params.query);
  if (params.prefix) url.searchParams.set("prefix", params.prefix);
  if (typeof params.limit === "number")
    url.searchParams.set("limit", String(params.limit));
  if (typeof params.offset === "number")
    url.searchParams.set("start", String(params.offset));
  url.searchParams.set("pretty", "1");

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Iconify search failed: ${resp.status} ${resp.statusText}`);
  }
  const data = (await resp.json()) as IconifySearchResponse;
  const iconsRaw = Array.isArray(data.icons) ? (data.icons as string[]) : [];
  const parsed = iconsRaw
    .map((full) => parseIconifyId(String(full)))
    .filter(Boolean) as Array<{ prefix: string; name: string }>;
  return {
    icons: parsed,
    total: typeof data.total === "number" ? data.total : parsed.length,
    limit: typeof data.limit === "number" ? data.limit : params.limit,
    offset: typeof data.start === "number" ? data.start : params.offset,
  };
};

export const iconifyGetCollections = async () => {
  const resp = await fetch(`${ICONIFY_API_BASE}/collections`);
  if (!resp.ok) {
    throw new Error(
      `Iconify collections failed: ${resp.status} ${resp.statusText}`
    );
  }
  const data = (await resp.json()) as Record<string, IconifyCollectionResponse>;
  return Object.entries(data).map(([prefix, info]) => ({
    prefix,
    name: String(info.name ?? prefix),
    total: Number(info.total ?? 0),
    author: String(info.author?.name ?? ""),
    license: String(info.license?.title ?? ""),
  }));
};

export const iconifyGetCollectionIcons = async (prefix: string) => {
  const url = new URL(`${ICONIFY_API_BASE}/collection`);
  url.searchParams.set("prefix", prefix);
  url.searchParams.set("pretty", "1");

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(
      `Iconify collection failed: ${resp.status} ${resp.statusText}`
    );
  }
  const data = (await resp.json()) as IconifyCollectionIconsResponse;
  const uncategorized = Array.isArray(data.uncategorized)
    ? (data.uncategorized as string[])
    : [];
  const categories = data.categories ?? {};
  const categorizedIcons = Object.keys(categories).reduce((acc, categoryKey) => {
    const items = categories[categoryKey];
    if (Array.isArray(items)) acc.push(...items);
    return acc;
  }, [] as string[]);

  return {
    uncategorized,
    categories,
    iconNames: [...uncategorized, ...categorizedIcons],
  };
};

export const iconifyGetSvg = async (prefix: string, name: string) => {
  const resp = await fetch(`${ICONIFY_API_BASE}/${prefix}/${name}.svg`);
  if (!resp.ok) {
    throw new Error(`Iconify svg failed: ${resp.status} ${resp.statusText}`);
  }
  return await resp.text();
};

export const iconifyGetCss = async (prefix: string, names: string[]) => {
  const url = new URL(`${ICONIFY_API_BASE}/${prefix}.css`);
  url.searchParams.set("icons", names.join(","));
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Iconify css failed: ${resp.status} ${resp.statusText}`);
  }
  return await resp.text();
};

export const iconifyToInternalIcon = (prefix: string, name: string): Icon => {
  const tags = name.includes("-") ? name.split("-") : [name];
  return {
    id: toInternalIconId(prefix, name),
    name,
    svg: "",
    library: prefix,
    category: "",
    tags,
    synonyms: [],
  };
};
