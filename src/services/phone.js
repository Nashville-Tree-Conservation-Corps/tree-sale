// Squarespace stores phone numbers as free text ("6155550123", "(615) 555-0123",
// "+1 615-555-0123"). Format US numbers for reading; always dial from the digits.
export const phoneDigits = (phone) => String(phone ?? "").replace(/\D/g, "")

export const formatPhone = (phone) => {
    const digits = phoneDigits(phone)
    const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits
    if (national.length === 10) {
        return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`
    }
    return String(phone ?? "").trim()
}

// tel: link target, or null when there is nothing dialable
export const telHref = (phone) => {
    const digits = phoneDigits(phone)
    return digits.length >= 7 ? `tel:${String(phone).trim().startsWith("+") ? "+" : ""}${digits}` : null
}
