import { describe, it, expect } from "vitest"
import { formatPhone, telHref } from "./phone"

describe("phone helpers", () => {
    it("formats 10-digit and 11-digit US numbers", () => {
        expect(formatPhone("6155550123")).toBe("(615) 555-0123")
        expect(formatPhone("+1 615-555-0123")).toBe("(615) 555-0123")
        expect(formatPhone("(615) 555-0123")).toBe("(615) 555-0123")
    })

    it("leaves other formats as written", () => {
        expect(formatPhone("+44 20 7946 0958")).toBe("+44 20 7946 0958")
    })

    it("builds a tel link from the digits", () => {
        expect(telHref("(615) 555-0123")).toBe("tel:6155550123")
        expect(telHref("+44 20 7946 0958")).toBe("tel:+442079460958")
    })

    it("returns null when there is no usable number", () => {
        expect(telHref(null)).toBeNull()
        expect(telHref("")).toBeNull()
        expect(telHref("ext 5")).toBeNull()
    })
})
