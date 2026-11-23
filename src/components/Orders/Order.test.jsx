import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { Order } from "./Order"

vi.mock("../../services/orderServices", () => ({
    setCalled811: vi.fn(),
    fulfillOrder: vi.fn()
}))

import { setCalled811, fulfillOrder } from "../../services/orderServices"

const testOrder = {
    id: "6f2b9c41e8d3a05517f04c2e",
    orderNumber: "1042",
    customerName: "Dana Whitfield",
    city: "Nashville",
    state: "TN",
    zipCode: "37206",
    date: "2026-11-14T12:00:00.000Z",
    status: "PENDING",
    includesPlanting: false,
    called811: false,
    totalQuantity: 2,
    guardQuantity: 0
}

const renderOrder = (order = testOrder) =>
    render(
        <MemoryRouter>
            <Order order={order} />
        </MemoryRouter>
    )

describe("Order card", () => {
    beforeEach(() => {
        setCalled811.mockReset()
        setCalled811.mockResolvedValue({})
    })

    it("shows the customer-facing order number, not the backend id", () => {
        renderOrder()

        expect(screen.getByText("#1042")).toBeInTheDocument()
        expect(screen.queryByText(testOrder.id)).not.toBeInTheDocument()
    })

    it("toggles 811 called and saves it", async () => {
        renderOrder()
        const box = screen.getByRole("checkbox", { name: /811 called/i })
        expect(box).toHaveAttribute("aria-checked", "false")

        fireEvent.click(box)

        expect(box).toHaveAttribute("aria-checked", "true")
        expect(setCalled811).toHaveBeenCalledWith(testOrder.id, true)
    })

    it("reverts the check and shows an error when saving fails", async () => {
        setCalled811.mockRejectedValue(new Error("nope"))
        renderOrder()
        const box = screen.getByRole("checkbox", { name: /811 called/i })

        fireEvent.click(box)

        await waitFor(() => expect(box).toHaveAttribute("aria-checked", "false"))
        expect(await screen.findByText(/could not save/i)).toBeInTheDocument()
    })

    it("only shows the 811 check on active orders", () => {
        renderOrder({ ...testOrder, status: "FULFILLED" })

        expect(screen.queryByRole("checkbox", { name: /811 called/i })).not.toBeInTheDocument()
    })

    it("shows guards apart from the tree count", () => {
        renderOrder({ ...testOrder, guardQuantity: 3 })

        expect(screen.getByText("2 trees")).toBeInTheDocument()
        expect(screen.getByText("3 guards")).toBeInTheDocument()
    })

    it("asks to confirm before fulfilling, and Cancel sends nothing", () => {
        renderOrder()

        fireEvent.click(screen.getByRole("checkbox", { name: /^fulfilled$/i }))
        expect(screen.getByText(/can't be undone/i)).toBeInTheDocument()
        expect(fulfillOrder).not.toHaveBeenCalled()

        fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
        expect(screen.queryByText(/can't be undone/i)).not.toBeInTheDocument()
        expect(fulfillOrder).not.toHaveBeenCalled()
    })

    it("fulfills after confirming and tells the list", async () => {
        fulfillOrder.mockResolvedValue({})
        const onFulfilled = vi.fn()
        render(<MemoryRouter><Order order={testOrder} onFulfilled={onFulfilled} /></MemoryRouter>)

        fireEvent.click(screen.getByRole("checkbox", { name: /^fulfilled$/i }))
        fireEvent.click(screen.getByRole("button", { name: /yes, fulfilled/i }))

        await waitFor(() => expect(onFulfilled).toHaveBeenCalledWith(testOrder.id))
        expect(fulfillOrder).toHaveBeenCalledWith(testOrder.id)
    })

    it("shows the error and keeps the order when fulfilling fails", async () => {
        fulfillOrder.mockRejectedValue(new Error("Squarespace refused the update."))
        const onFulfilled = vi.fn()
        render(<MemoryRouter><Order order={testOrder} onFulfilled={onFulfilled} /></MemoryRouter>)

        fireEvent.click(screen.getByRole("checkbox", { name: /^fulfilled$/i }))
        fireEvent.click(screen.getByRole("button", { name: /yes, fulfilled/i }))

        expect(await screen.findByText(/squarespace refused/i)).toBeInTheDocument()
        expect(onFulfilled).not.toHaveBeenCalled()
    })

    it("shows a tap-to-call link when the order has a phone number", () => {
        renderOrder({ ...testOrder, phone: "6155550123" })

        const link = screen.getByRole("link", { name: /call dana whitfield/i })
        expect(link).toHaveAttribute("href", "tel:6155550123")
        expect(link).toHaveTextContent("(615) 555-0123")
    })

    it("shows no phone link when there is no number", () => {
        renderOrder({ ...testOrder, phone: null })

        expect(screen.queryByRole("link", { name: /call/i })).not.toBeInTheDocument()
    })
})
