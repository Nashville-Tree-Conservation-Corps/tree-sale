import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { AllOrders } from "./AllOrders"

const { mockGetAllOrders } = vi.hoisted(() => ({ mockGetAllOrders: vi.fn() }))

vi.mock("../../services/orderServices", () => ({ getAllOrders: mockGetAllOrders, setCalled811: vi.fn(), fulfillOrder: vi.fn() }))

const order = (id, date) => ({
    id,
    orderNumber: id,
    customerId: `cust-${id}`,
    customerName: `Customer ${id}`,
    city: "Nashville",
    state: "TN",
    zipCode: "37206",
    date,
    status: "PENDING",
    includesPlanting: false,
    hasDiscount: false,
    items: [],
    totalQuantity: 1,
    total: "50.00"
})

const renderAllOrders = () => render(
    <MemoryRouter>
        <AllOrders pageTitle="All Orders" />
    </MemoryRouter>
)

describe("AllOrders season filter", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockGetAllOrders.mockResolvedValue([
            order("this-season", "2026-11-14T12:00:00.000Z"),
            order("last-season", "2025-10-02T12:00:00.000Z")
        ])
    })

    it("defaults to the most recent season with orders and lists only seasons that have orders", async () => {
        renderAllOrders()

        expect(await screen.findByText("#this-season")).toBeInTheDocument()
        expect(screen.queryByText("#last-season")).not.toBeInTheDocument()

        const seasonSelect = screen.getByRole("combobox", { name: /season/i })
        expect(seasonSelect.value).toBe("2026-2027")
        const options = within(seasonSelect).getAllByRole("option")
        expect(options.map((option) => option.value)).toEqual(["2026-2027", "2025-2026"])
    })

    it("does not invent a season when the newest orders are from a past season", async () => {
        mockGetAllOrders.mockResolvedValue([order("old", "2025-10-02T12:00:00.000Z")])
        renderAllOrders()

        expect(await screen.findByText("#old")).toBeInTheDocument()
        const seasonSelect = screen.getByRole("combobox", { name: /season/i })
        expect(seasonSelect.value).toBe("2025-2026")
        expect(within(seasonSelect).getAllByRole("option").map((option) => option.value)).toEqual(["2025-2026"])
    })

    it("narrows the list to the chosen season", async () => {
        renderAllOrders()
        await screen.findByText("#this-season")

        const seasonSelect = screen.getByRole("combobox", { name: /season/i })
        await userEvent.selectOptions(seasonSelect, "2025-2026")

        expect(screen.getByText("#last-season")).toBeInTheDocument()
        expect(screen.queryByText("#this-season")).not.toBeInTheDocument()
    })
})

describe("AllOrders zip filter and printing", () => {
    const pending = (id, zip, extra = {}) => ({ ...order(id, "2026-11-14T12:00:00.000Z"), zipCode: zip, address: "1 Oak St", ...extra })

    beforeEach(() => {
        vi.clearAllMocks()
        mockGetAllOrders.mockResolvedValue([
            pending("a", "37206"),
            pending("b", "37215", { items: [{ name: "White Oak", variant: "Size: 3 inch", customizations: [], kind: "tree", quantity: 1 }] }),
            pending("c", "37206")
        ])
        window.print = vi.fn()
    })

    const renderPending = () => render(
        <MemoryRouter>
            <AllOrders statusFilter="PENDING" pageTitle="Pending Orders" />
        </MemoryRouter>
    )

    it("filters the list to one zip code", async () => {
        const user = userEvent.setup()
        renderPending()
        await screen.findByText("#b", { selector: ".order-row-id" })

        await user.selectOptions(screen.getByLabelText("Zip code"), "37215")

        const list = document.querySelector(".order-list")
        expect(within(list).getByText("#b")).toBeInTheDocument()
        expect(within(list).queryByText("#a")).not.toBeInTheDocument()
    })

    it("prints, with a sheet grouped by zip that shows sizes", async () => {
        const user = userEvent.setup()
        renderPending()
        const sheet = await screen.findByLabelText("Printable orders", { selector: "section" })

        expect(within(sheet).getByRole("heading", { name: /^37206/ })).toBeInTheDocument()
        expect(within(sheet).getByRole("heading", { name: /^37215/ })).toBeInTheDocument()
        expect(within(sheet).getByText("(Size: 3 inch)")).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Print" }))
        expect(window.print).toHaveBeenCalled()
    })

    it("has no Print button on lists other than Pending", async () => {
        renderAllOrders()
        await screen.findAllByText(/Customer/)
        expect(screen.queryByRole("button", { name: "Print" })).not.toBeInTheDocument()
    })
})
