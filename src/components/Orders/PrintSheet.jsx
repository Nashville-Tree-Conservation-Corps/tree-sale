import { formatPhone } from "../../services/phone"

const byZipThenStreet = (a, b) =>
    String(a.zipCode).localeCompare(String(b.zipCode)) ||
    String(a.address ?? "").localeCompare(String(b.address ?? ""), undefined, { numeric: true }) ||
    new Date(a.date) - new Date(b.date)

const groupByZip = (orders) => {
    const groups = new Map()
    for (const order of [...orders].sort(byZipThenStreet)) {
        const zip = order.zipCode || "No zip code"
        if (!groups.has(zip)) groups.set(zip, [])
        groups.get(zip).push(order)
    }
    return [...groups]
}

const Box = ({ checked }) => <span className="print-box">{checked ? "☑" : "☐"}</span>

// A plain, ink-friendly list of orders for the planter. Hidden on screen and
// shown only when printing (see the @media print rules in Orders.css).
export const PrintSheet = ({ orders, title }) => {
    const groups = groupByZip(orders)

    return (
        <section className="print-sheet" aria-label="Printable orders">
            <header className="print-header">
                <h1>{title}</h1>
                <p>{orders.length} {orders.length === 1 ? "order" : "orders"} · Printed {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            </header>

            {groups.map(([zip, zipOrders]) => (
                <div key={zip} className="print-zip-group">
                    <h2 className="print-zip">{zip} <span>({zipOrders.length})</span></h2>

                    {zipOrders.map(order => {
                        const trees = order.items.filter(item => item.kind === "tree")
                        return (
                            <article key={order.id} className="print-order">
                                <div className="print-order-top">
                                    <strong>#{order.orderNumber} · {order.customerName}</strong>
                                    <span>
                                        <Box checked={order.called811} /> 811 called&nbsp;&nbsp;
                                        <Box checked={false} /> Delivered
                                    </span>
                                </div>
                                <div>{[order.address, order.city, order.state, order.zipCode].filter(Boolean).join(", ")}</div>
                                {order.phone && <div>{formatPhone(order.phone)}</div>}
                                <ul className="print-items">
                                    {trees.map((item, index) => (
                                        <li key={index}>
                                            {item.quantity} × {item.name}
                                            {item.variant && <strong> ({item.variant})</strong>}
                                            {item.customizations?.map(text => <em key={text}> — {text}</em>)}
                                        </li>
                                    ))}
                                    {order.guardQuantity > 0 && <li>{order.guardQuantity} × tree guard{order.guardQuantity === 1 ? "" : "s"}</li>}
                                </ul>
                                {order.includesPlanting && <div className="print-planting">Planting requested</div>}
                            </article>
                        )
                    })}
                </div>
            ))}
        </section>
    )
}
