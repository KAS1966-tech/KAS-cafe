const LS_HISTORY = "kasCafeOrders";
const LS_THEME = "kasCafeTheme";

const historyList = document.getElementById("historyList");
const emptyMsg = document.getElementById("emptyMsg");
const historySearch = document.getElementById("historySearch");
const clearAllBtn = document.getElementById("clearAllBtn");
const exportBtn = document.getElementById("exportBtn");
const themeToggle = document.getElementById("themeToggle");

// Theme apply
(function initTheme() {
  const t = localStorage.getItem(LS_THEME) || "light";
  document.documentElement.setAttribute("data-theme", t);
  themeToggle.innerHTML = t === "dark"
    ? '<i class="ri-sun-line"></i>'
    : '<i class="ri-moon-fill"></i>';

})();

themeToggle.addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme") || "light";
  const next = cur === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(LS_THEME, next);
  themeToggle.innerHTML = next === "dark"
    ? '<i class="ri-sun-line"></i>'
    : '<i class="ri-moon-fill"></i>';

});

let data = [];
load();

function load() {
  data = JSON.parse(localStorage.getItem(LS_HISTORY) || "[]");
  render(data);
}

function render(list) {
  historyList.innerHTML = "";
  if (!list.length) {
    emptyMsg.classList.remove("hidden");
    return;
  }
  emptyMsg.classList.add("hidden");

  list.forEach(entry => {
    const { id, order } = entry;
    const el = document.createElement("div");
    el.className = "history-card";
    el.innerHTML = `
      <div class="history-head">
        <div>
          <strong>${escapeHTML(order.name)}</strong>
          <div class="history-meta">${escapeHTML(order.createdAt.pretty)} • ${escapeHTML(order.payment)}</div>
        </div>
        <div class="btn-row">
          <button class="btn ghost" data-print="${id}">Print</button>
          <button class="btn ghost" data-delete="${id}">Delete</button>
        </div>
      </div>
      <div class="history-body">
        <ul style="margin:8px 0 0 18px;">
          ${order.items.length ? order.items.map(i => `<li>${escapeHTML(i.name)} × ${i.qty} = Rs.${i.cost}</li>`).join("") : "<li>No items</li>"}
        </ul>
        ${order.delivery ? `
          <div class="history-meta" style="margin-top:6px;">
            Delivery → ${escapeHTML(order.delivery.address || "-")} • Fee Rs.${order.delivery.fee}
          </div>
        ` : ""}
        <div style="margin-top:8px;"><strong>Total: Rs.${order.total}</strong></div>
      </div>
    `;
    historyList.appendChild(el);
  });
}

// Search
historySearch.addEventListener("input", () => {
  const q = historySearch.value.toLowerCase().trim();
  const filtered = data.filter(({ order }) => {
    if (order.name.toLowerCase().includes(q)) return true;
    return order.items.some(i => i.name.toLowerCase().includes(q));
  });
  render(filtered);
});

// Delete one
historyList.addEventListener("click", (e) => {
  const delId = e.target.getAttribute("data-delete");
  const printId = e.target.getAttribute("data-print");

  if (delId) {
    data = data.filter(x => x.id !== delId);
    localStorage.setItem(LS_HISTORY, JSON.stringify(data));
    render(data);
  } else if (printId) {
    // Print a simple receipt view
    const entry = data.find(x => x.id === printId);
    if (!entry) return;
    const w = window.open("", "_blank");
    const o = entry.order;
    w.document.write(`<pre style="font-family: ui-monospace,Consolas,monospace">
KAS CAFE - RECEIPT
Date: ${escapeHTML(o.createdAt.pretty)}
Name: ${escapeHTML(o.name)}
Contact: ${escapeHTML(o.contact)}
Payment: ${escapeHTML(o.payment)}

Items:
${o.items.map(i => `- ${i.name} x ${i.qty} = Rs.${i.cost}`).join("\n") || "- None"}

${o.delivery ? `Delivery: ${escapeHTML(o.delivery.address || "-")} | Fee Rs.${o.delivery.fee}` : ""}

TOTAL: Rs.${o.total}
</pre>`);
    w.document.close();
    w.focus();
    w.print();
  }
});

// Delete all
clearAllBtn.addEventListener("click", () => {
  if (confirm("Delete all order history on this device?")) {
    localStorage.removeItem(LS_HISTORY);
    load();
  }
});

// Export
exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "kas-cafe-history.json";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
});

function escapeHTML(str) {
  return String(str ?? "").replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}
