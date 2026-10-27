import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function canonicalRemote(remote) {
  const value = remote.trim();
  let url;
  try {
    if (/^[^/\\:]+@[^/\\:]+:.+/.test(value)) {
      const [, host, repo] = value.match(/^[^@]+@([^:]+):(.+)$/);
      url = new URL(`ssh://${host}/${repo}`);
    } else {
      url = new URL(value);
    }
    if (!["https:", "http:", "ssh:", "git:"].includes(url.protocol) ||
        !url.hostname || url.search || url.hash) throw new Error();
  } catch {
    throw new Error("Unsupported Git remote. Use an HTTPS or SSH repository URL without query parameters.");
  }
  const host = url.hostname.toLowerCase();
  let repo;
  try {
    repo = decodeURIComponent(url.pathname).replace(/^\/+|\/+$/g, "").replace(/\.git$/, "");
  } catch {
    throw new Error("Invalid encoding in Git remote.");
  }
  if (!repo || repo.split("/").some((part) => !part || part === "." || part === "..") ||
      /[\\\x00-\x1f]/.test(repo)) {
    throw new Error("Git remote must identify a repository path.");
  }
  if (host === "github.com" || host === "gitlab.com") repo = repo.toLowerCase();
  const port = url.port && !(url.protocol === "ssh:" && url.port === "22") &&
    !(url.protocol === "git:" && url.port === "9418") ? `:${url.port}` : "";
  return `${host}${port}/${repo}`;
}

export function configRoot({ platform = process.platform, env = process.env, mainCheckoutRoot } = {}) {
  const paths = platform === "win32" ? path.win32 : path.posix;
  const override = env.MATT_POCOCK_SKILLS_CONFIG_HOME;
  if (override) {
    if (!paths.isAbsolute(override)) throw new Error("MATT_POCOCK_SKILLS_CONFIG_HOME must be absolute.");
    return override;
  }
  if (!mainCheckoutRoot || !paths.isAbsolute(mainCheckoutRoot)) {
    throw new Error("An absolute main checkout path is required to locate sibling skill-config. Set MATT_POCOCK_SKILLS_CONFIG_HOME to override it.");
  }
  const root = paths.join(paths.dirname(mainCheckoutRoot), "skill-config");
  const relative = paths.relative(mainCheckoutRoot, root);
  if (!relative.startsWith(`..${paths.sep}`) && relative !== "..") {
    throw new Error("Sibling skill-config would be inside the repository. Set MATT_POCOCK_SKILLS_CONFIG_HOME to an external directory.");
  }
  return root;
}

export function configLocation(identity, options = {}) {
  const paths = (options.platform || process.platform) === "win32" ? path.win32 : path.posix;
  const hash = createHash("sha256").update(identity, "utf8").digest("hex").slice(0, 12);
  const name = identity.startsWith("local:")
    ? options.mainCheckoutRoot ? paths.basename(options.mainCheckoutRoot) : "local-repo"
    : identity.split("/").slice(-2).join("-");
  const slug = name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "repo";
  const directory = paths.join(configRoot(options), `${slug}-${hash}`);
  return {
    identity,
    directory,
    files: {
      tracker: paths.join(directory, "issue-tracker.md"),
      labels: paths.join(directory, "triage-labels.md"),
      domain: paths.join(directory, "domain.md"),
    },
  };
}

function git(cwd, args) {
  try {
    return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    throw new Error("Cannot read Git repository metadata. Run from a Git working tree and check its remotes.");
  }
}

export function resolveRepository(cwd = process.cwd(), options = {}) {
  const repositoryRoot = path.resolve(git(cwd, ["rev-parse", "--show-toplevel"]));
  const commonDirectory = realpathSync(path.resolve(cwd, git(cwd, ["rev-parse", "--git-common-dir"])));
  const gitDirectory = realpathSync(path.resolve(cwd, git(cwd, ["rev-parse", "--git-dir"])));
  const worktrees = git(cwd, ["worktree", "list", "--porcelain", "-z"]).split("\0");
  const mainEntry = worktrees[0];
  if (!mainEntry.startsWith("worktree ") || worktrees[1] === "bare") {
    throw new Error("Cannot locate a main working-tree checkout for sibling configuration.");
  }
  const mainCheckoutRoot = gitDirectory === commonDirectory
    ? repositoryRoot
    : path.resolve(mainEntry.slice("worktree ".length));
  const remotes = git(cwd, ["remote"]).split(/\r?\n/).filter(Boolean);
  let identity;
  if (remotes.length) {
    const remote = remotes.includes("origin") ? "origin" : remotes.length === 1 ? remotes[0] : null;
    if (!remote) throw new Error("Multiple Git remotes without origin. Name the canonical repository remote origin, then run /setup-matt-pocock-skills.");
    const urls = git(cwd, ["config", "--get-all", `remote.${remote}.url`]).split(/\r?\n/);
    const identities = new Set(urls.map(canonicalRemote));
    if (identities.size !== 1) throw new Error("Canonical remote has multiple repository URLs. Resolve the ambiguity before setup.");
    [identity] = identities;
  } else {
    identity = `local:${commonDirectory}`;
  }
  return { ...configLocation(identity, { ...options, mainCheckoutRoot }), repositoryRoot, mainCheckoutRoot };
}

export function requireConfig(location, names) {
  for (const name of names) {
    if (!Object.hasOwn(location.files, name)) throw new Error(`Unknown config kind: ${name}`);
    const filename = location.files[name];
    let content;
    try {
      content = readFileSync(filename, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error(`Missing ${name} config at ${filename}. Run /setup-matt-pocock-skills in this repository first.`);
      }
      throw new Error(`Cannot read ${name} config at ${filename} (${error.code}). Check file permissions.`);
    }
    if (!content.trim()) throw new Error(`Empty ${name} config at ${filename}. Run /setup-matt-pocock-skills in this repository first.`);
  }
}

function main(args) {
  if (args.some((arg) => !["tracker", "labels", "domain"].includes(arg))) {
    throw new Error("Usage: node repository-config.mjs [tracker] [labels] [domain]");
  }
  const location = resolveRepository();
  requireConfig(location, args);
  console.log(JSON.stringify(location, null, 2));
}

if (process.argv[1] && realpathSync(path.resolve(process.argv[1])) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
