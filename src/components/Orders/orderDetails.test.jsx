import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { OrderDetails } from "./orderDetails"

vi.mock("../../services/orderServices", () => ({
    getOrderById: vi.fn(),
    getOrdersByCustomer: vi.fn()
}))

import { getOrderById, getOrdersByCustomer } from "../../services/orderServices"

const testOrder = {
    id: "6f2b9c41e8d3a05517f04c2e",
    orderNumber: "1042",
    customerId: "cust-1",
    customerName: "Dana Whitfield",
    address: "1421 Holly St",
    city: "Nashville",
    state: "TN",
    zipCode: "37206",
    date: "2026-11-14T12:00:00.000Z",
    status: "PENDING",
    includesPlanting: true,
    hasDiscount: false,
    notes: "Gate code 4415",
    items: [{ name: "Red Maple", kind: "tree", quantity: 2, price: "45.00" }],
    guardQuantity: 0,
    totalQuantity: 2,
    total: "90.00"
}

const renderDetails = () =>
    render(
        <MemoryRouter initialEntries={[`/order/${testOrder.id}`]}>
            <Routes>
                <Route path="/order/:orderId" element={<OrderDetails />} />
            </Routes>
        </MemoryRouter>
    )

describe("OrderDetails order number", () => {
    beforeEach(() => {
        getOrderById.mockResolvedValue(testOrder)
        getOrdersByCustomer.mockResolvedValue([testOrder])
        Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue() } })
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it("shows the customer-facing order number", async () => {
        renderDetails()

        expect(await screen.findByText("#1042")).toBeInTheDocument()
    })

    it("copies the order number to the clipboard on click and confirms", async () => {
        renderDetails()

        fireEvent.click(await screen.findByRole("button", { name: /copy order number/i }))

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith("1042")
        expect(await screen.findByText(/copied/i)).toBeInTheDocument()
    })

    it("shows failure feedback when the clipboard write rejects", async () => {
        navigator.clipboard.writeText.mockRejectedValue(new Error("denied"))
        renderDetails()

        fireEvent.click(await screen.findByRole("button", { name: /copy order number/i }))

        expect(await screen.findByText(/copy failed/i)).toBeInTheDocument()
    })
})

describe("OrderDetails unfulfilled inventory", () => {
    const other = (overrides) => ({ ...testOrder, id: "other", orderNumber: "1043", ...overrides })

    beforeEach(() => {
        vi.useFakeTimers({ now: new Date("2026-11-19T12:00:00.000Z"), toFake: ["Date"] })
        getOrderById.mockResolvedValue(testOrder)
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it("leaves out canceled orders, fulfilled orders, and other seasons", async () => {
        getOrdersByCustomer.mockResolvedValue([
            testOrder,
            other({ status: "CANCELED", items: [{ name: "Canceled Oak", kind: "tree", quantity: 1 }] }),
            other({ status: "FULFILLED", items: [{ name: "Fulfilled Elm", kind: "tree", quantity: 1 }] }),
            other({ date: "2026-03-01T12:00:00.000Z", items: [{ name: "Last Season Birch", kind: "tree", quantity: 1 }] }),
            other({ id: "ok", items: [{ name: "Dogwood", kind: "tree", quantity: 3 }] })
        ])
        renderDetails()

        const box = (await screen.findByText(/UNFULFILLED INVENTORY/)).closest(".detail-box")
        await waitFor(() => expect(box).toHaveTextContent("Dogwood"))
        expect(box).toHaveTextContent("Red Maple")
        expect(box).not.toHaveTextContent("Canceled Oak")
        expect(box).not.toHaveTextContent("Fulfilled Elm")
        expect(box).not.toHaveTextContent("Last Season Birch")
    })

    it("lists guards separately from trees", async () => {
        getOrdersByCustomer.mockResolvedValue([
            testOrder,
            other({ id: "g", guardQuantity: 4, items: [{ name: "Tree Guard", kind: "guard", quantity: 4 }] })
        ])
        renderDetails()

        const box = (await screen.findByText(/UNFULFILLED INVENTORY/)).closest(".detail-box")
        await waitFor(() => expect(box).toHaveTextContent("Tree guards"))
        expect(box).toHaveTextContent("x4")
    })
})
