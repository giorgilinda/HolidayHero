import { formatDate, capitalize, debounce } from "@/utils";

describe("Utils", () => {
  describe("formatDate", () => {
    it("should format a date correctly", () => {
      const date = new Date("2024-01-15");
      const formatted = formatDate(date);
      expect(formatted).toBe("January 15, 2024");
    });
  });

  describe("capitalize", () => {
    it("should capitalize the first letter", () => {
      expect(capitalize("hello")).toBe("Hello");
      expect(capitalize("world")).toBe("World");
    });

    it("should handle empty strings", () => {
      expect(capitalize("")).toBe("");
    });
  });

  describe("debounce", () => {
    jest.useFakeTimers();

    it("should debounce function calls", () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});
