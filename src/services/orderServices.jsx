import { getIdToken, logOut } from "./auth"

export const authFetch = async (path, { method = "GET", body } = {}) => {
    const token = await getIdToken()

    if (!token) {
        window.location.assign("/login")
        throw new Error("Unauthorized")
    }

    const res = await fetch(`${import.meta.env.VITE_API_URL ?? ""}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(body !== undefined && { "Content-Type": "application/json" })
        },
        ...(body !== undefined && { body: JSON.stringify(body) })
    })

    if (res.status === 401) {
        await logOut()
        window.location.assign("/login")
        throw new Error("Unauthorized")
    }

    if (res.status === 403) {
        window.location.assign("/pending-access")
        throw new Error("Forbidden")
    }

    if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `Request to ${path} failed with status ${res.status}`)
    }

    return res.json()
}

export const getAllOrders = (status) => {
    return authFetch(status ? `/api/orders?status=${status}` : "/api/orders")
}

export const getOrderById = (id) => {
    return authFetch(`/api/orders/${id}`)
}

export const getOrdersByCustomer = (customerId) => {
    return authFetch(`/api/customers/${customerId}/orders`)
}

export const getSalesData = (season) => {
    return authFetch(season ? `/api/sales?season=${season}` : "/api/sales")
}

export const setCalled811 = (orderId, called) => {
    return authFetch(`/api/orders/${orderId}/811`, { method: "PUT", body: { called } })
}
