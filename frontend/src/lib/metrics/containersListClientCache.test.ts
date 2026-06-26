import {
  clearContainersListClientCache,
  getContainersListCached,
} from "./containersListClientCache";

describe("containersListClientCache", () => {
  beforeEach(() => {
    clearContainersListClientCache();
  });

  it("dedupe les requêtes concurrentes", async () => {
    let calls = 0;
    const fetcher = jest.fn(async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 10));
      return [{ name: "jobbingtrack-frontend" }];
    });

    const [a, b] = await Promise.all([
      getContainersListCached("light=1", fetcher, 30_000),
      getContainersListCached("light=1", fetcher, 30_000),
    ]);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(calls).toBe(1);
    expect(a).toEqual(b);
  });

  it("respecte des clés de cache distinctes", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce([{ name: "a" }])
      .mockResolvedValueOnce([{ name: "b" }]);

    const light = await getContainersListCached("light=1", fetcher, 30_000);
    const full = await getContainersListCached("light=0", fetcher, 30_000);

    expect(light[0].name).toBe("a");
    expect(full[0].name).toBe("b");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
