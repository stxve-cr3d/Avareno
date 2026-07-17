#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

const checks = [];
const createdAuthUsers = [];
let runtime;

function check(name, condition) {
  if (!condition) throw new Error(`check failed: ${name}`);
  checks.push(name);
  process.stdout.write(`PASS ${name}\n`);
}

function parseStatusEnv() {
  const output = execFileSync("npx", ["supabase", "status", "-o", "env"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  });
  const values = {};
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  for (const key of ["API_URL", "ANON_KEY", "SERVICE_ROLE_KEY"]) {
    if (!values[key]) throw new Error(`local Supabase status is missing ${key}`);
  }
  return {
    apiUrl: values.API_URL.replace(/\/$/, ""),
    anonKey: values.ANON_KEY,
    serviceRoleKey: values.SERVICE_ROLE_KEY,
    target: "local"
  };
}

function parseRuntime() {
  const remote = {
    apiUrl: process.env.AVARENO_QA_SUPABASE_URL?.trim(),
    anonKey: process.env.AVARENO_QA_SUPABASE_PUBLISHABLE_KEY?.trim(),
    serviceRoleKey: process.env.AVARENO_QA_SUPABASE_SERVICE_ROLE_KEY?.trim()
  };
  const supplied = Object.values(remote).filter(Boolean).length;

  if (supplied === 0) return parseStatusEnv();
  if (supplied !== 3) throw new Error("remote beta QA requires URL, publishable key and service-role key together");

  let url;
  try {
    url = new URL(remote.apiUrl);
  } catch {
    throw new Error("remote beta QA URL is invalid");
  }

  const expectedRef = process.env.AVARENO_QA_EXPECTED_PROJECT_REF?.trim();
  if (!expectedRef || process.env.AVARENO_QA_TARGET_ENV !== "beta") {
    throw new Error("remote beta QA requires an expected project ref and AVARENO_QA_TARGET_ENV=beta");
  }
  if (url.protocol !== "https:" || url.hostname !== `${expectedRef}.supabase.co` || url.pathname !== "/") {
    throw new Error("remote beta QA URL does not match the explicitly expected project ref");
  }

  return {
    apiUrl: remote.apiUrl.replace(/\/$/, ""),
    anonKey: remote.anonKey,
    serviceRoleKey: remote.serviceRoleKey,
    target: "remote-beta"
  };
}

async function apiRequest(path, { key, token = key, method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${runtime.apiUrl}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }
  return { status: response.status, data };
}

async function storageRequest(path, { token, method = "GET", bytes, headers = {} }) {
  const response = await fetch(`${runtime.apiUrl}${path}`, {
    method,
    headers: {
      apikey: runtime.anonKey,
      Authorization: `Bearer ${token}`,
      ...headers
    },
    body: bytes
  });
  return { status: response.status, bytes: new Uint8Array(await response.arrayBuffer()) };
}

async function createInvitedUser(label) {
  const suffix = randomUUID();
  const email = `beta-${label}-${suffix}@example.test`;
  const password = `Local-${suffix}-9x`;
  const created = await apiRequest("/auth/v1/admin/users", {
    key: runtime.serviceRoleKey,
    method: "POST",
    body: { email, password, email_confirm: true, user_metadata: { display_name: `Beta ${label}` } }
  });
  check(`admin provisions user ${label}`, created.status === 200 && Boolean(created.data?.id));
  createdAuthUsers.push(created.data.id);

  const login = await apiRequest("/auth/v1/token?grant_type=password", {
    key: runtime.anonKey,
    method: "POST",
    body: { email, password }
  });
  if (login.status !== 200 || !login.data?.access_token) {
    const code = typeof login.data?.error_code === "string" ? login.data.error_code : "unknown";
    throw new Error(`user ${label} email/password login returned HTTP ${login.status} (${code})`);
  }
  check(`user ${label} email/password login`, true);
  return { id: created.data.id, email, password, token: login.data.access_token };
}

function restPath(table, query = "") {
  return `/rest/v1/${table}${query ? `?${query}` : ""}`;
}

async function rest(user, table, { method = "GET", query = "", body, prefer } = {}) {
  return apiRequest(restPath(table, query), {
    key: runtime.anonKey,
    token: user.token,
    method,
    body,
    headers: prefer ? { Prefer: prefer } : {}
  });
}

async function serviceDelete(table, column, value) {
  const query = new URLSearchParams({ [column]: `eq.${value}` }).toString();
  await apiRequest(restPath(table, query), {
    key: runtime.serviceRoleKey,
    method: "DELETE",
    headers: { Prefer: "return=minimal" }
  });
}

async function deleteAuthUser(id) {
  const response = await apiRequest(`/auth/v1/admin/users/${encodeURIComponent(id)}?should_soft_delete=false`, {
    key: runtime.serviceRoleKey,
    method: "DELETE"
  });
  if (![200, 204, 404].includes(response.status)) throw new Error("controlled Auth cleanup failed");
  const index = createdAuthUsers.indexOf(id);
  if (index >= 0) createdAuthUsers.splice(index, 1);
}

function generatedFileName(extension = "pdf") {
  return `${randomUUID().replaceAll("-", "")}.${extension}`;
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForBackend(baseUrl, process) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error("controlled backend exited before QA");
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.status === 200) return;
    } catch {
      // Retry only the fixed local process until the bounded deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("controlled backend did not become ready");
}

async function stopBackend(process) {
  if (process.exitCode !== null) return;
  process.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => process.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000))
  ]);
  if (process.exitCode === null) process.kill("SIGKILL");
}

async function backendRequest(baseUrl, path, token, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...headers },
    body
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }
  return { status: response.status, data };
}

async function runIntegratedAccountDeletion(userA, userB, pdfBytes) {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const root = mkdtempSync(join(tmpdir(), "avareno-account-delete-"));
  const backend = spawn(
    "python3",
    ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", String(port)],
    {
      cwd: new URL("./backend", import.meta.url),
      stdio: "ignore",
      env: {
        ...process.env,
        AVARENO_DB_PATH: join(root, "qa.db"),
        AVARENO_UPLOAD_ROOT: join(root, "uploads"),
        AVARENO_REQUIRE_AUTH: "1",
        AVARENO_ENABLE_STATIC_UPLOADS: "0",
        BETA_INVITE_ONLY: "true",
        ENABLE_RECEIPT_EXTRACTION: "false",
        ENABLE_DOCUMENT_PROCESSING: "false",
        ENABLE_OAUTH: "false",
        ENABLE_HOUSEHOLD_SHARING: "false",
        ENABLE_PUBLIC_DOCUMENT_LINKS: "false",
        ENABLE_INLINE_DOCUMENT_PREVIEW: "false",
        ENABLE_BILLING: "false",
        ENABLE_DOCUMENT_UPLOADS: "true",
        SUPABASE_URL: runtime.apiUrl,
        SUPABASE_PUBLISHABLE_KEY: runtime.anonKey,
        SUPABASE_SERVICE_ROLE_KEY: runtime.serviceRoleKey
      }
    }
  );

  try {
    await waitForBackend(baseUrl, backend);
    check("integrated backend verifies User A session", (await backendRequest(baseUrl, "/api/structure/spaces", userA.token)).status === 200);
    check("integrated backend verifies User B session", (await backendRequest(baseUrl, "/api/structure/spaces", userB.token)).status === 200);

    const itemA = await backendRequest(baseUrl, "/api/items", userA.token, {
      method: "POST",
      body: JSON.stringify({ name: "Integrated delete A", category: "QA" }),
      headers: { "Content-Type": "application/json" }
    });
    const itemB = await backendRequest(baseUrl, "/api/items", userB.token, {
      method: "POST",
      body: JSON.stringify({ name: "Integrated keep B", category: "QA" }),
      headers: { "Content-Type": "application/json" }
    });
    check("integrated backend creates controlled User A item", itemA.status === 201 && Boolean(itemA.data?.id));
    check("integrated backend creates controlled User B item", itemB.status === 201 && Boolean(itemB.data?.id));

    const form = new FormData();
    form.append("type", "OTHER");
    form.append("itemId", itemA.data.id);
    form.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "controlled-delete.pdf");
    const upload = await backendRequest(baseUrl, "/api/documents/upload", userA.token, { method: "POST", body: form });
    check("integrated deletion has a private local document", upload.status === 201 && upload.data?.fileName === "controlled-delete.pdf");

    const deleted = await backendRequest(baseUrl, "/api/privacy/deletion/request", userA.token, { method: "POST" });
    if (!(deleted.status === 200 && deleted.data?.deleted === true)) {
      const reason = typeof deleted.data?.detail === "string" ? deleted.data.detail : "unavailable";
      throw new Error(`account deletion returned HTTP ${deleted.status} (${reason})`);
    }
    check(
      "account endpoint deletes database, Storage, local files and Auth",
      deleted.data?.authUserDeleted === true && deleted.data?.localFileCount === 1
    );

    const oldBackendToken = await backendRequest(baseUrl, "/api/items", userA.token);
    check("old token rejected by integrated backend after deletion", oldBackendToken.status === 401);
    const bItems = await backendRequest(baseUrl, "/api/items", userB.token);
    check("integrated account deletion leaves User B local data intact", bItems.status === 200 && bItems.data?.some((item) => item.id === itemB.data.id));
  } finally {
    await stopBackend(backend);
    rmSync(root, { recursive: true, force: true });
  }
}

async function main() {
  runtime = parseRuntime();

  const config = readFileSync(new URL("./supabase/config.toml", import.meta.url), "utf8");
  check("open signup disabled in local config", /\[auth\][\s\S]*?enable_signup = false/.test(config));
  check("email/password provider active for invited users", /\[auth\.email\][\s\S]*?enable_signup = true/.test(config));
  check("OAuth provider disabled in local config", /\[auth\.external\.apple\][\s\S]*?enabled = false/.test(config));
  check("Storage global limit is 10 MiB", /\[storage\][\s\S]*?file_size_limit = "10MiB"/.test(config));

  const publicSignup = await apiRequest("/auth/v1/signup", {
    key: runtime.anonKey,
    method: "POST",
    body: { email: `closed-signup-${randomUUID()}@example.test`, password: `Closed-${randomUUID()}-7x` }
  });
  check("public signup rejected", publicSignup.status >= 400);

  const userA = await createInvitedUser("a");
  const userB = await createInvitedUser("b");
  const now = new Date().toISOString();

  const anonItems = await apiRequest(restPath("Item", "select=id"), { key: runtime.anonKey });
  check("anonymous database access denied", [401, 403].includes(anonItems.status));

  for (const user of [userA, userB]) {
    const profile = await rest(user, "User", {
      method: "POST",
      body: { id: user.id, name: `Beta ${user === userA ? "A" : "B"}`, email: user.email, createdAt: now, updatedAt: now },
      prefer: "return=representation"
    });
    check(`user ${user === userA ? "A" : "B"} creates own profile`, profile.status === 201 && profile.data?.length === 1);
  }

  const householdA = randomUUID();
  const householdB = randomUUID();
  const spaceA = randomUUID();
  const spaceB = randomUUID();
  const itemA = randomUUID();
  const itemB = randomUUID();
  const documentA = randomUUID();
  const documentB = randomUUID();

  for (const [user, householdId, spaceId, itemId, documentId, label] of [
    [userA, householdA, spaceA, itemA, documentA, "A"],
    [userB, householdB, spaceB, itemB, documentB, "B"]
  ]) {
    check(`user ${label} creates own household`, (await rest(user, "Household", {
      method: "POST", body: { id: householdId, userId: user.id, name: `Home ${label}` }, prefer: "return=representation"
    })).status === 201);
    check(`user ${label} creates own space`, (await rest(user, "Space", {
      method: "POST", body: { id: spaceId, householdId, name: `Room ${label}` }, prefer: "return=representation"
    })).status === 201);
    check(`user ${label} creates own item`, (await rest(user, "Item", {
      method: "POST",
      body: { id: itemId, userId: user.id, householdId, spaceId, name: `Item ${label}`, category: "QA" },
      prefer: "return=representation"
    })).status === 201);
    check(`user ${label} creates own document metadata`, (await rest(user, "Document", {
      method: "POST",
      body: {
        id: documentId,
        userId: user.id,
        itemId,
        type: "RECEIPT",
        fileName: `controlled-${label}.pdf`,
        filePath: `documents/${user.id}/${generatedFileName()}`,
        mimeType: "application/pdf",
        fileSize: 18
      },
      prefer: "return=representation"
    })).status === 201);
  }

  const rowsA = await rest(userA, "Item", { query: "select=id,userId" });
  const rowsB = await rest(userB, "Item", { query: "select=id,userId" });
  check("User A sees only own items", rowsA.status === 200 && rowsA.data?.length === 1 && rowsA.data[0].id === itemA);
  check("User B sees only own items", rowsB.status === 200 && rowsB.data?.length === 1 && rowsB.data[0].id === itemB);

  const foreignHousehold = await rest(userA, "Item", {
    method: "POST",
    body: { id: randomUUID(), userId: userA.id, householdId: householdB, name: "Denied", category: "QA" }
  });
  check("foreign householdId relation denied", foreignHousehold.status >= 400);

  const foreignSpace = await rest(userA, "Item", {
    method: "POST",
    body: { id: randomUUID(), userId: userA.id, householdId: householdA, spaceId: spaceB, name: "Denied", category: "QA" }
  });
  check("foreign spaceId relation denied", foreignSpace.status >= 400);

  const foreignParent = await rest(userA, "Space", {
    method: "POST",
    body: { id: randomUUID(), householdId: householdA, parentId: spaceB, name: "Denied child" }
  });
  check("foreign parentId relation denied", foreignParent.status >= 400);

  const selfMembership = await rest(userA, "HouseholdMember", {
    method: "POST",
    body: { id: randomUUID(), householdId: householdB, userId: userA.id, email: userA.email, role: "OWNER", status: "ACTIVE" }
  });
  check("self-add to foreign household denied", selfMembership.status >= 400);

  const foreignItemDocument = await rest(userA, "Document", {
    method: "POST",
    body: {
      id: randomUUID(), userId: userA.id, itemId: itemB, type: "RECEIPT",
      fileName: "denied.pdf", filePath: `documents/${userA.id}/${generatedFileName()}`,
      mimeType: "application/pdf", fileSize: 18
    }
  });
  check("foreign itemId document relation denied", foreignItemDocument.status >= 400);

  const ownershipReassignment = await rest(userA, "Item", {
    method: "PATCH",
    query: new URLSearchParams({ id: `eq.${itemA}` }).toString(),
    body: { userId: userB.id },
    prefer: "return=representation"
  });
  check("ownership reassignment denied", ownershipReassignment.status >= 400 || ownershipReassignment.data?.length === 0);

  const foreignDocumentRead = await rest(userA, "Document", {
    query: new URLSearchParams({ select: "id,fileName", id: `eq.${documentB}` }).toString()
  });
  check("foreign document metadata hidden", foreignDocumentRead.status === 200 && foreignDocumentRead.data?.length === 0);

  const storagePath = `${userA.id}/${generatedFileName()}`;
  const storageUrlPath = `/storage/v1/object/documents/${storagePath}`;
  const pdfV1 = new TextEncoder().encode("%PDF-1.4 controlled beta A");
  const pdfV2 = new TextEncoder().encode("%PDF-1.4 controlled beta A updated");
  check("User A uploads own private file", (await storageRequest(storageUrlPath, {
    token: userA.token, method: "POST", bytes: pdfV1, headers: { "Content-Type": "application/pdf" }
  })).status === 200);

  const ownList = await apiRequest("/storage/v1/object/list/documents", {
    key: runtime.anonKey, token: userA.token, method: "POST", body: { prefix: userA.id, limit: 100, offset: 0 }
  });
  check("User A lists own private file", ownList.status === 200 && ownList.data?.some((entry) => entry.name === storagePath.split("/")[1]));

  const foreignList = await apiRequest("/storage/v1/object/list/documents", {
    key: runtime.anonKey, token: userB.token, method: "POST", body: { prefix: userA.id, limit: 100, offset: 0 }
  });
  check("User B cannot list User A files", foreignList.status === 200 && foreignList.data?.length === 0);

  const ownDownload = await storageRequest(`/storage/v1/object/authenticated/documents/${storagePath}`, { token: userA.token });
  check("User A reads own private file", ownDownload.status === 200 && ownDownload.bytes.length === pdfV1.length);
  check("User B cannot read User A file", (await storageRequest(`/storage/v1/object/authenticated/documents/${storagePath}`, { token: userB.token })).status >= 400);
  check("anonymous cannot read private file", (await storageRequest(`/storage/v1/object/authenticated/documents/${storagePath}`, { token: runtime.anonKey })).status >= 400);

  const foreignSigned = await apiRequest(`/storage/v1/object/sign/documents/${storagePath}`, {
    key: runtime.anonKey, token: userB.token, method: "POST", body: { expiresIn: 60 }
  });
  check("User B cannot create signed URL for User A", foreignSigned.status >= 400);

  check("User B cannot change User A file", (await storageRequest(storageUrlPath, {
    token: userB.token, method: "PUT", bytes: pdfV2, headers: { "Content-Type": "application/pdf", "x-upsert": "true" }
  })).status >= 400);
  check("User A changes own private file", (await storageRequest(storageUrlPath, {
    token: userA.token, method: "PUT", bytes: pdfV2, headers: { "Content-Type": "application/pdf", "x-upsert": "true" }
  })).status === 200);

  const foreignDelete = await apiRequest("/storage/v1/object/documents", {
    key: runtime.anonKey, token: userB.token, method: "DELETE", body: { prefixes: [storagePath] }
  });
  check(
    "User B cannot delete User A file",
    foreignDelete.status >= 400 || (foreignDelete.status === 200 && Array.isArray(foreignDelete.data) && foreignDelete.data.length === 0)
  );
  const afterForeignDelete = await storageRequest(`/storage/v1/object/authenticated/documents/${storagePath}`, { token: userA.token });
  check("denied Storage delete has no side effect", afterForeignDelete.status === 200);

  const ownDelete = await apiRequest("/storage/v1/object/documents", {
    key: runtime.anonKey, token: userA.token, method: "DELETE", body: { prefixes: [storagePath] }
  });
  check("User A deletes own private file", ownDelete.status === 200);

  const deletionStoragePath = `${userA.id}/${generatedFileName()}`;
  check("account deletion has a controlled private Storage object", (await storageRequest(`/storage/v1/object/documents/${deletionStoragePath}`, {
    token: userA.token, method: "POST", bytes: pdfV1, headers: { "Content-Type": "application/pdf" }
  })).status === 200);

  // Run the real backend deletion orchestrator against the controlled local
  // Supabase instance, including Storage API cleanup and Auth deletion last.
  await runIntegratedAccountDeletion(userA, userB, pdfV1);

  const serviceStorageList = await apiRequest("/storage/v1/object/list/documents", {
    key: runtime.serviceRoleKey,
    method: "POST",
    body: { prefix: userA.id, limit: 100, offset: 0 }
  });
  check("account deletion verifies User A Storage prefix is empty", serviceStorageList.status === 200 && serviceStorageList.data?.length === 0);
  const deletedProfile = await apiRequest(restPath("User", new URLSearchParams({ select: "id", id: `eq.${userA.id}` }).toString()), {
    key: runtime.serviceRoleKey
  });
  check("account deletion verifies User A public profile is absent", deletedProfile.status === 200 && deletedProfile.data?.length === 0);

  const oldTokenAuth = await apiRequest("/auth/v1/user", { key: runtime.anonKey, token: userA.token });
  check("old token rejected by Auth after deletion", [401, 403].includes(oldTokenAuth.status));
  const oldTokenMutation = await rest(userA, "User", {
    method: "POST",
    body: { id: userA.id, name: "Must not return", email: userA.email, createdAt: now, updatedAt: now }
  });
  check("old token cannot mutate database", oldTokenMutation.status >= 400);
  const oldTokenStorage = await storageRequest(`/storage/v1/object/documents/${userA.id}/${generatedFileName()}`, {
    token: userA.token, method: "POST", bytes: pdfV1, headers: { "Content-Type": "application/pdf" }
  });
  check("old token cannot mutate Storage", oldTokenStorage.status >= 400);

  const bStillOwnsItem = await rest(userB, "Item", { query: new URLSearchParams({ select: "id", id: `eq.${itemB}` }).toString() });
  check("User B remains unaffected after User A deletion", bStillOwnsItem.status === 200 && bStillOwnsItem.data?.length === 1);

  await serviceDelete("HouseholdMember", "userId", userB.id);
  await serviceDelete("User", "id", userB.id);
  await deleteAuthUser(userB.id);
}

try {
  await main();
  process.stdout.write(`PASS beta security regression (${checks.length} checks)\n`);
} catch (error) {
  process.stderr.write(`FAIL beta security regression: ${error instanceof Error ? error.message : "unknown error"}\n`);
  process.exitCode = 1;
} finally {
  if (runtime) {
    for (const id of [...createdAuthUsers]) {
      try {
        await serviceDelete("HouseholdMember", "userId", id);
        await serviceDelete("User", "id", id);
        await deleteAuthUser(id);
      } catch {
        process.stderr.write("WARN controlled QA cleanup requires manual review\n");
      }
    }
  }
}
