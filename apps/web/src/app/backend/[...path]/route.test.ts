import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

describe("backend proxy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses the runtime API service origin", async () => {
    vi.stubEnv("API_ORIGIN", "http://api:8000");
    const fetchMock = vi.fn().mockResolvedValue(new Response("ready", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new Request("https://idiyappam.midhunpm.in/backend/health/ready"),
      { params: Promise.resolve({ path: ["health", "ready"] }) },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://api:8000/health/ready"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(await response.text()).toBe("ready");
  });
});
