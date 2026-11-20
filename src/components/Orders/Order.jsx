import "./Orders.css"
import { useState } from "react"
import { Link } from "react-router-dom"
import { StatusBadge } from "./StatusBadge"
import { SproutIcon } from "./SproutIcon"
import { setCalled811, fulfillOrder } from "../../services/orderServices"

const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`

export const Order = ({order, onFulfilled}) => {
    const [called811, setCalled] = useState(order.called811 === true)
    const [saveFailed, setSaveFailed] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [fulfilling, setFulfilling] = useState(false)
    const [fulfillError, setFulfillError] = useState(null)
    const isActive = order.status === "PENDING"

    // One-way: Squarespace has no "unfulfill", so ask before sending it
    const confirmFulfill = () => {
        setFulfilling(true)
        setFulfillError(null)
        fulfillOrder(order.id)
            .then(() => onFulfilled?.(order.id))
            .catch((err) => {
                setFulfillError(err.message)
                setFulfilling(false)
                setConfirming(false)
            })
    }

    const toggle811 = () => {
        const next = !called811
        setCalled(next)
        setSaveFailed(false)
        setCalled811(order.id, next).catch(() => {
            setCalled(!next)
            setSaveFailed(true)
        })
    }

    return (
        <article className="order-card">
            <Link to={`/order/${order.id}`}
            className="order-link">
                <div className="order-card-content">
                    <div className="order-title-row">
                        <span className="order-date">{formatDate(order.date)}</span>
                        <StatusBadge status={order.status} />
                        <span className="order-row-id">#{order.orderNumber}</span>
                    </div>
                    <span className="order-customer">
                        {order.customerName} · {order.city}, {order.state} {order.zipCode}
                    </span>
                    {order.includesPlanting ? (
                        <div className="order-planting">
                            <SproutIcon />
                            <span>Planting requested</span>
                        </div>
                    ) : (
                        <div className="order-no-planting">
                            <span>No planting</span>
                        </div>
                    )}
                </div>
                <div className="order-card-right">
                    <div className="order-quantities">
                        <span className="order-quantity">{plural(order.totalQuantity, "tree")}</span>
                        {order.guardQuantity > 0 && (
                            <span className="order-guards">{plural(order.guardQuantity, "guard")}</span>
                        )}
                    </div>
                    <svg className="order-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                </div>
            </Link>
            {isActive && (
                <div className="order-811">
                    <button
                        type="button"
                        className={`check-811${called811 ? " check-811-on" : ""}`}
                        role="checkbox"
                        aria-checked={called811}
                        onClick={toggle811}
                    >
                        <span className="check-811-box" aria-hidden="true">
                            {called811 && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                            )}
                        </span>
                        811 called
                    </button>
                    {saveFailed && <span className="check-811-error">Could not save. Try again.</span>}

                    {!confirming ? (
                        <button
                            type="button"
                            className="check-811 check-fulfilled"
                            role="checkbox"
                            aria-checked="false"
                            onClick={() => setConfirming(true)}
                        >
                            <span className="check-811-box" aria-hidden="true"></span>
                            Fulfilled
                        </button>
                    ) : (
                        <span className="fulfill-confirm" role="group" aria-label="Confirm fulfilled">
                            <span>Mark fulfilled in Squarespace? This can't be undone here.</span>
                            <button type="button" className="fulfill-yes" onClick={confirmFulfill} disabled={fulfilling}>
                                {fulfilling ? "Saving..." : "Yes, fulfilled"}
                            </button>
                            <button type="button" className="fulfill-no" onClick={() => setConfirming(false)} disabled={fulfilling}>
                                Cancel
                            </button>
                        </span>
                    )}
                    {fulfillError && <span className="check-811-error">{fulfillError}</span>}
                </div>
            )}
        </article>
    )
}
