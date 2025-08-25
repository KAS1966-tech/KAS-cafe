// ===== elements =====
const orderForm = document.getElementById("orderForm");
const billSection = document.getElementById("billSection");
const billDetails = document.getElementById("billDetails");
const clearOrderBtn = document.getElementById("clearOrderBtn");

const acceptTerms = document.getElementById("acceptTerms");
const generateBtn = document.getElementById("generateBtn");
const openTerms = document.getElementById("openTerms");
const termsModal = document.getElementById("termsModal");
const closeTerms = document.getElementById("closeTerms");

const isDelivery = document.getElementById("isDelivery");
const deliveryFields = document.getElementById("deliveryFields");
const deliveryAddress = document.getElementById("deliveryAddress");
const deliveryNote = document.getElementById("deliveryNote");
const deliveryTime = document.getElementById("deliveryTime");
const deliveryFee = document.getElementById("deliveryFee");

const permissionModal = document.getElementById("permissionModal");
const allowHistory = document.getElementById("allowHistory");
const denyHistory = document.getElementById("denyHistory");

const themeToggle = document.getElementById("themeToggle");
const menuSearch = document.getElementById("menuSearch");
const menuList = document.getElementById("menuList");

const discountCodeEl = document.getElementById("discountCode");
const discountMsg = document.getElementById("discountMsg");
const serviceChargeEl = document.getElementById("serviceCharge");
const applyServiceEl = document.getElementById("applyService");

// ===== prices & keys =====
const prices = {
    tea: 40,
    samosa: 30,
    biscuit: 20,
    sandwich: 120,
    burger: 100,
    shawarma: 150,
    kasta_quarter: 100,
    milk_glass: 50,
    gulab_jamun_quarter: 150
};

const LS_ORDER = "kasCafeOrder";
const LS_HISTORY = "kasCafeOrders";
const LS_HISTORY_OK = "kasCafeHistoryPermission";
const LS_THEME = "kasCafeTheme";

// discount rules
const DISCOUNT_RULES = {
    "KAS10": { type: "percent", value: 10, note: "10% off subtotal" },
    "KAS20": { type: "percent", value: 20, min: 1000, note: "20% off orders >= Rs.1000" },
    "FREEDEL": { type: "freeDelivery", note: "Delivery fee waived" }
};

// ===== helpers =====
function nowStamp() {
    const d = new Date();
    return { iso: d.toISOString(), pretty: d.toLocaleString() };
}
function labelFor(id) {
    const map = {
        tea: "Tea", samosa: "Samosa", biscuit: "Biscuit", sandwich: "Sandwich",
        burger: "Burger", shawarma: "Shawarma", kasta_quarter: "Kasta (1/4)",
        milk_glass: "Milk (Glass)", gulab_jamun_quarter: "Gulab Jamun (1/4)"
    };
    return map[id] || id;
}
function escapeHTML(str) {
    return String(str ?? "").replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}
function cryptoRandomId() {
    if (window.crypto && crypto.getRandomValues) {
        const a = new Uint32Array(2); crypto.getRandomValues(a);
        return [...a].map(x => x.toString(36)).join("");
    }
    return "id_" + Math.random().toString(36).slice(2);
}

// build order object (reads form)
function buildOrderObject() {
    const name = document.getElementById("customerName").value.trim();
    const contact = document.getElementById("customerContact").value.trim();
    const payment = document.getElementById("paymentMode").value;

    let subtotal = 0;
    const items = [];

    Object.keys(prices).forEach(key => {
        const qty = parseInt(document.getElementById(key).value, 10) || 0;
        const noteEl = document.getElementById("note_" + key);
        const note = noteEl ? noteEl.value.trim() : "";
        if (qty > 0) {
            const cost = qty * prices[key];
            subtotal += cost;
            items.push({ id: key, name: labelFor(key), qty, unit: prices[key], cost, note });
        }
    });

    // service charge
    const applyService = applyServiceEl.checked;
    const servicePercent = Number(serviceChargeEl.value) || 0;
    const serviceAmount = applyService ? Math.round((subtotal * servicePercent) / 100) : 0;

    // delivery
    const delivery = isDelivery.checked ? {
        address: deliveryAddress.value.trim(),
        note: deliveryNote.value.trim(),
        time: deliveryTime.value,
        fee: Number(deliveryFee.value) || 0
    } : null;

    // discount
    const code = (discountCodeEl.value || "").trim().toUpperCase();
    const rule = DISCOUNT_RULES[code] || null;
    let discount = { code: null, amount: 0, note: null };

    if (rule) {
        if (rule.type === "percent") {
            if (rule.min && subtotal < (rule.min || 0)) {
                // not eligible
                discount.note = `Code ${code} requires minimum Rs.${rule.min}`;
            } else {
                const base = subtotal + serviceAmount; // apply percent on subtotal+service
                discount.amount = Math.round((base * rule.value) / 100);
                discount.code = code;
                discount.note = rule.note;
            }
        } else if (rule.type === "freeDelivery") {
            if (delivery) {
                discount.code = code;
                discount.amount = delivery.fee;
                discount.note = rule.note;
            } else {
                discount.note = `Code ${code} applies to delivery only.`;
            }
        }
    } else if (code) {
        discount.note = "Invalid discount code";
    }

    // compute final
    const subtotalPlusService = subtotal + serviceAmount;
    const deliveryFeeVal = delivery ? delivery.fee : 0;
    const totalBeforeDiscount = subtotalPlusService + deliveryFeeVal;
    const finalTotal = Math.max(0, totalBeforeDiscount - discount.amount);

    return {
        name, contact, payment,
        items,
        subtotal,
        service: { applied: applyService, percent: servicePercent, amount: serviceAmount },
        delivery,
        discount,
        total: finalTotal,
        createdAt: nowStamp()
    };
}

// show bill UI
function showBill(order) {
    let html = `
    <p><strong>Name:</strong> ${escapeHTML(order.name)}</p>
    <p><strong>Contact:</strong> ${escapeHTML(order.contact)}</p>
    <p><strong>Payment:</strong> ${escapeHTML(order.payment)}</p>
    <p><strong>Date:</strong> ${escapeHTML(order.createdAt.pretty)}</p>
    <hr><h3>Items</h3><ul>
  `;

    if (order.items.length) {
        order.items.forEach(i => {
            const noteHTML = i.note ? ` <em style="color:var(--muted)">(${escapeHTML(i.note)})</em>` : "";
            html += `<li>${escapeHTML(i.name)} × ${i.qty} = Rs.${i.cost}${noteHTML}</li>`;
        });
    } else {
        html += `<li>No items selected</li>`;
    }
    html += `</ul>`;

    html += `<hr>
    <div><strong>Subtotal:</strong> Rs.${order.subtotal}</div>`;

    if (order.service.applied) {
        html += `<div><strong>Service (${order.service.percent}%):</strong> Rs.${order.service.amount}</div>`;
    }

    if (order.delivery) {
        html += `<div><strong>Delivery Fee:</strong> Rs.${order.delivery.fee}</div>`;
    }

    if (order.discount && (order.discount.code || order.discount.note)) {
        const codeText = order.discount.code ? ` (${order.discount.code})` : "";
        const amountText = order.discount.amount ? `- Rs.${order.discount.amount}` : "";
        html += `<div style="margin-top:8px;color:var(--muted);"><strong>Discount${codeText}:</strong> ${order.discount.note || ""} ${amountText}</div>`;
    }

    html += `<hr><h3>Final Total: Rs.${order.total}</h3>`;

    billDetails.innerHTML = html;
    billSection.classList.remove("hidden");
}

// load saved order (fill form)
window.addEventListener("DOMContentLoaded", () => {
    // theme
    const savedTheme = localStorage.getItem(LS_THEME);
    if (savedTheme) {
        document.documentElement.setAttribute("data-theme", savedTheme);
        themeToggle.textContent = savedTheme === "dark" ? "☀️" : "🌙";
    }

    const saved = localStorage.getItem(LS_ORDER);
    if (saved) {
        try {
            const o = JSON.parse(saved);
            document.getElementById("customerName").value = o.name || "";
            document.getElementById("customerContact").value = o.contact || "";
            document.getElementById("paymentMode").value = o.payment || "";

            // items qty & notes
            Object.keys(prices).forEach(id => {
                const el = document.getElementById(id);
                const noteEl = document.getElementById("note_" + id);
                if (el) el.value = o[id] ?? 0;
                if (noteEl) noteEl.value = (o.notes && o.notes[id]) || "";
            });

            // delivery
            if (o.delivery) {
                isDelivery.checked = true;
                deliveryFields.classList.add("show");
                deliveryAddress.value = o.delivery.address || "";
                deliveryNote.value = o.delivery.note || "";
                deliveryTime.value = o.delivery.time || "";
                deliveryFee.value = o.delivery.fee ?? 0;
            }

            // service & discount
            applyServiceEl.checked = !!(o.service && o.service.applied);
            serviceChargeEl.value = (o.service && o.service.percent) || 0;
            discountCodeEl.value = (o.discount && o.discount.code) || "";

            // show loaded bill preview
            // rebuild order object from saved flat structure
            const reconstructed = buildOrderObject();
            showBill(reconstructed);
        } catch (e) { /* ignore parse errors */ }
    }
});

// search menu
menuSearch.addEventListener("input", () => {
    const q = menuSearch.value.toLowerCase().trim();
    Array.from(menuList.children).forEach(card => {
        const name = card.dataset.name || "";
        card.style.display = name.includes(q) ? "" : "none";
    });
});

// delivery toggle
isDelivery.addEventListener("change", () => {
    deliveryFields.classList.toggle("show", isDelivery.checked);
});

// terms modal open/close & enable button
openTerms.addEventListener("click", (e) => { e.preventDefault(); termsModal.classList.remove("hidden"); });
closeTerms.addEventListener("click", () => termsModal.classList.add("hidden"));
acceptTerms.addEventListener("change", () => generateBtn.disabled = !acceptTerms.checked);

// theme toggle
themeToggle.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(LS_THEME, next);
    themeToggle.textContent = next === "dark" ? "☀️" : "🌙";
});

// discount validation feedback
discountCodeEl.addEventListener("input", () => {
    const code = (discountCodeEl.value || "").trim().toUpperCase();
    if (!code) { discountMsg.textContent = ""; return; }
    const rule = DISCOUNT_RULES[code];
    if (!rule) {
        discountMsg.textContent = "Invalid code";
        return;
    }
    discountMsg.textContent = rule.note || "Valid code";
});

// submit
orderForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!acceptTerms.checked) return;

    // build order and save
    const order = buildOrderObject();

    // flatten a small object to persist form re-fill (including notes)
    const flat = { name: order.name, contact: order.contact, payment: order.payment, notes: {} };
    Object.keys(prices).forEach(id => {
        flat[id] = document.getElementById(id).value || 0;
        const n = document.getElementById("note_" + id);
        flat.notes[id] = n ? n.value.trim() : "";
    });
    flat.delivery = order.delivery || null;
    flat.service = order.service || null;
    flat.discount = order.discount || null;

    localStorage.setItem(LS_ORDER, JSON.stringify(flat));

    // history permission flow
    const histOk = localStorage.getItem(LS_HISTORY_OK);
    if (histOk === null) {
        permissionModal.classList.remove("hidden");
        allowHistory.onclick = () => {
            localStorage.setItem(LS_HISTORY_OK, "yes");
            permissionModal.classList.add("hidden");
            appendToHistory(order);
        };
        denyHistory.onclick = () => {
            localStorage.setItem(LS_HISTORY_OK, "no");
            permissionModal.classList.add("hidden");
        };
    } else if (histOk === "yes") {
        appendToHistory(order);
    }

    showBill(order);
});

// clear current order
clearOrderBtn.addEventListener("click", () => {
    localStorage.removeItem(LS_ORDER);
    orderForm.reset();
    billSection.classList.add("hidden");
    deliveryFields.classList.remove("show");
});

// append to history
function appendToHistory(order) {
    const arr = JSON.parse(localStorage.getItem(LS_HISTORY) || "[]");
    arr.unshift({ id: cryptoRandomId(), order });
    localStorage.setItem(LS_HISTORY, JSON.stringify(arr));
}
