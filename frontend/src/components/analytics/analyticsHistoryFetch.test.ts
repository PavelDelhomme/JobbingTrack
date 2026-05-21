import {
  beginUserRangeFetch,
  isBenignFetchAbort,
} from "./analyticsHistoryFetch";

describe("analyticsHistoryFetch", () => {
  describe("isBenignFetchAbort", () => {
    it("reconnaît AbortError", () => {
      expect(
        isBenignFetchAbort(new DOMException("aborted", "AbortError")),
      ).toBe(true);
    });

    it("reconnaît ERR_CANCELED axios", () => {
      expect(isBenignFetchAbort({ code: "ERR_CANCELED" })).toBe(true);
    });

    it("ignore les autres erreurs", () => {
      expect(isBenignFetchAbort(new Error("network"))).toBe(false);
      expect(isBenignFetchAbort(null)).toBe(false);
    });
  });

  describe("beginUserRangeFetch", () => {
    it("active le chargement hors silent sans vider les données courantes", () => {
      const setData = jest.fn();
      const setLoading = jest.fn();
      beginUserRangeFetch(false, setData, setLoading);
      expect(setLoading).toHaveBeenCalledWith(true);
      expect(setData).not.toHaveBeenCalled();
    });

    it("ne touche pas l’état en actualisation silencieuse", () => {
      const setData = jest.fn();
      const setLoading = jest.fn();
      beginUserRangeFetch(true, setData, setLoading);
      expect(setData).not.toHaveBeenCalled();
      expect(setLoading).not.toHaveBeenCalled();
    });
  });
});
