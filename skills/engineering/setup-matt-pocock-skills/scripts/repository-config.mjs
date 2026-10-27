import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
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

export function configRoot({ platform = process.platform, env = process.env, home = homedir() } = {}) {
  const paths = platform === "win32" ? path.win32 : path.posix;
  const override = env.MATT_POCOCK_SKILLS_CONFIG_HOME;
  if (override) {
    if (!paths.isAbsolute(override)) throw new Error("MATT_POCOCK_SKILLS_CONFIG_HOME must be absolute.");
    return override;
  }
  if (platform === "win32") {
    const base = env.LOCALAPPDATA || paths.join(home, "AppData", "Local");
    if (!paths.isAbsolute(base)) throw new Error("LOCALAPPDATA must be absolute.");
    return paths.join(base, "matt-pocock-skills");
  }
  if (platform === "darwin") return paths.join(home, "Library", "Application Support", "matt-pocock-skills");
  const base = env.XDG_CONFIG_HOME || paths.join(home, ".config");
  if (!paths.isAbsolute(base)) throw new Error("XDG_CONFIG_HOME must be absolute.");
  return paths.join(base, "matt-pocock-skills");
}

export function configLocation(identity, options = {}) {
  const paths = (options.platform || process.platform) === "win32" ? path.win32 : path.posix;
  const key = createHash("sha256").update(identity, "utf8").digest("hex");
  const directory = paths.join(configRoot(options), "repositories", key);
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
    const common = git(cwd, ["rev-parse", "--git-common-dir"]);
    identity = `local:${realpathSync(path.resolve(cwd, common))}`;
  }
  return { ...configLocation(identity, options), repositoryRoot };
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
