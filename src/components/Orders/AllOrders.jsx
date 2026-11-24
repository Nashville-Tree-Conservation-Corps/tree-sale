import "./Orders.css"
import { useState, useEffect } from "react"
import { getAllOrders } from "../../services/orderServices"
import { SearchBar } from "./SearchBar"
import { Order } from "./Order"
import { PrintSheet } from "./PrintSheet"
import { SproutIcon } from "./SproutIcon"
import { Loading } from "../Loading"
import { PageTitle } from "../PageTitle"
import { ErrorMessage } from "../ErrorMessage"
import { seasonOf, seasonsOf } from "../../services/season"

const sortOrders = (orders, sortOption) => {
    const sorted = [...orders]
    if (sortOption === "zip") {
        sorted.sort((a, b) => String(a.zipCode).localeCompare(String(b.zipCode)))
    } else if (sortOption === "homeowner") {
        sorted.sort((a, b) => a.customerName.localeCompare(b.customerName))
    } else {
        sorted.sort((a, b) => new Date(b.date) - new Date(a.date))
    }
    return sorted
}

const emptyMessage = (statusFilter) => {
    if (statusFilter === "PENDING") return "No pending orders."
    if (statusFilter === "FULFILLED") return "No fulfilled orders."
    return "No orders yet."
}

export const AllOrders = ({ statusFilter, pageTitle }) => {
    const [orders, setOrders] = useState([])
    const [loadedFor, setLoadedFor] = useState(null)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [filterOption, setFilterOption] = useState("none")
    const [seasonOption, setSeasonOption] = useState(null)
    const [sortOption, setSortOption] = useState("newest")
    const [zipOption, setZipOption] = useState("all")

    useEffect(() => {
        setError(null)
        getAllOrders(statusFilter)
            .then((orderArray) => {
                setOrders(orderArray)
                setSeasonOption(seasonsOf(orderArray)[0] ?? null)
                setLoadedFor(statusFilter ?? "ALL")
            })
            .catch((err) => setError(err.message))
    }, [statusFilter])

    // After an order is fulfilled in Squarespace, drop it from a filtered list
    // (Pending) or flip its status in the full list
    const handleFulfilled = (orderId) => {
        setOrders((current) => statusFilter
            ? current.filter(o => o.id !== orderId)
            : current.map(o => o.id === orderId ? { ...o, status: "FULFILLED" } : o))
    }

    const loaded = loadedFor === (statusFilter ?? "ALL")
    const seasons = seasonsOf(orders)

    let filtered = seasonOption ? orders.filter(order => seasonOf(order.date) === seasonOption) : orders

    // Zip codes present in this season's orders; a stale choice falls back to all
    const zips = [...new Set(filtered.map(order => order.zipCode).filter(Boolean))].sort()
    const activeZip = zips.includes(zipOption) ? zipOption : "all"

    if (activeZip !== "all") {
        filtered = filtered.filter(order => order.zipCode === activeZip)
    }

    if (searchTerm !== "") {
        filtered = filtered.filter(order =>
            order.customerName
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
        )
    }

    if (filterOption === "planting") {
        filtered = filtered.filter(order => order.includesPlanting)
    }

    if (filterOption === "discount") {
        filtered = filtered.filter(order => order.hasDiscount)
    }

    const filteredOrders = sortOrders(filtered, sortOption)

    const printTitle = `Pending Orders${seasonOption ? ` · ${seasonOption}` : ""}${activeZip !== "all" ? ` · ${activeZip}` : " · All zip codes"}`

    return (
    <div className="app-container">
        <PageTitle>Tree Sale</PageTitle>

        <div className="controls-row">
            <h2 className="page-header">{pageTitle}</h2>

            <div className="controls-right">
                <label className="control-select">
                    <span className="control-select-label">Season</span>
                    <select
                        value={seasonOption ?? ""}
                        onChange={(event) => setSeasonOption(event.target.value)}
                        disabled={seasons.length === 0}
                    >
                        {seasons.map((season) => (
                            <option key={season} value={season}>{season}</option>
                        ))}
                    </select>
                </label>

                <label className="control-select">
                    <span className="control-select-label">Zip code</span>
                    <select
                        value={activeZip}
                        onChange={(event) => setZipOption(event.target.value)}
                        disabled={zips.length === 0}
                    >
                        <option value="all">All zip codes</option>
                        {zips.map((zip) => (
                            <option key={zip} value={zip}>{zip}</option>
                        ))}
                    </select>
                </label>

                <label className="control-select">
                    <span className="control-select-label">Filter</span>
                    <select
                        value={filterOption}
                        onChange={(event) => setFilterOption(event.target.value)}
                    >
                        <option value="none">All orders</option>
                        <option value="planting">Planting requested</option>
                        <option value="discount">Discount used</option>
                    </select>
                </label>

                <label className="control-select">
                    <span className="control-select-label">Sort</span>
                    <select
                        value={sortOption}
                        onChange={(event) => setSortOption(event.target.value)}
                    >
                        <option value="newest">Newest first</option>
                        <option value="zip">Zip code</option>
                        <option value="homeowner">Homeowner</option>
                    </select>
                </label>

                <SearchBar setSearchTerm={setSearchTerm} />

                {statusFilter === "PENDING" && (
                    <button
                        type="button"
                        className="print-btn"
                        onClick={() => window.print()}
                        disabled={filteredOrders.length === 0}
                    >
                        Print
                    </button>
                )}
            </div>
        </div>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {!loaded && !error && <Loading />}

        {loaded && orders.length === 0 && (
            <div className="empty-state">
                <SproutIcon size={28} />
                <p className="empty-state-message">{emptyMessage(statusFilter)}</p>
            </div>
        )}

        {loaded && orders.length > 0 && filteredOrders.length === 0 && (
            <div className="empty-state">
                <p className="empty-state-message">No orders match your search and filters.</p>
            </div>
        )}

        <div className="order-list">
            {filteredOrders.map((orderObj) => (
                <Order key={orderObj.id} order={orderObj} onFulfilled={handleFulfilled} />
            ))}
        </div>

        {statusFilter === "PENDING" && <PrintSheet orders={filteredOrders} title={printTitle} />}
    </div>
)}
