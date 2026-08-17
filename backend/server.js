import express from "express";
import cors from "cors";
import "dotenv/config";
import { pool, q } from "./db.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

const origins = (process.env.CORS_ORIGIN ?? "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : true }));

const num = (v) => Number(v ?? 0);
const json = (v, fallback = []) => {
  if (v == null) return fallback;
  if (typeof v === "object") return v;
  try { return JSON.parse(v); } catch { return fallback; }
};

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ error: e.message });
});

app.get("/api/health", wrap(async (_req, res) => {
  await q("SELECT 1");
  res.json({ ok: true });
}));

app.get("/api/categories", wrap(async (_req, res) => {
  res.json(await q("SELECT id, name, slug, icon FROM categories ORDER BY id"));
}));

app.get("/api/props", wrap(async (_req, res) => {
  const rows = await q(
    `SELECT p.*, c.slug AS category_slug FROM props p JOIN categories c ON c.id = p.category_id ORDER BY p.id`,
  );
  res.json(rows.map((p) => ({
    id: p.id,
    serial_number: p.serial_number,
    title: p.title,
    category_id: p.category_id,
    category_slug: p.category_slug,
    genre_tags: json(p.genre_tags),
    daily_rate: num(p.daily_rate),
    weekly_rate: num(p.weekly_rate),
    security_deposit: num(p.security_deposit),
    replacement_value: num(p.replacement_value),
    condition_rating: p.condition_rating,
    status: p.status,
    image_urls: json(p.image_urls),
    video_preview_url: p.video_preview_url ?? undefined,
    description: p.description ?? "",
    qr_code_id: p.qr_code_id,
  })));
}));

app.get("/api/clients", wrap(async (_req, res) => {
  res.json(await q(
    "SELECT id, production_house, contact_person, email, phone, gst_number, address FROM clients ORDER BY id",
  ));
}));

app.get("/api/bookings", wrap(async (_req, res) => {
  const bookings = await q(
    `SELECT b.*, cl.production_house FROM bookings b JOIN clients cl ON cl.id = b.client_id ORDER BY b.id DESC`,
  );
  const items = await q("SELECT booking_id, prop_id, prop_title, applied_daily_rate, quantity FROM booking_items");
  res.json(bookings.map((b) => ({
    id: b.id,
    booking_code: b.booking_code,
    client_id: b.client_id,
    production_house: b.production_house,
    start_date: new Date(b.start_date).toISOString().slice(0, 10),
    wrap_date: new Date(b.wrap_date).toISOString().slice(0, 10),
    items: items.filter((i) => i.booking_id === b.id).map((i) => ({
      prop_id: i.prop_id,
      prop_title: i.prop_title,
      applied_daily_rate: num(i.applied_daily_rate),
      quantity: i.quantity,
    })),
    total_rent: num(b.total_rent),
    security_deposit: num(b.security_deposit),
    advance_paid: num(b.advance_paid),
    balance_due: num(b.balance_due),
    deposit_status: b.deposit_status,
    rental_status: b.rental_status,
    notes: b.notes ?? undefined,
  })));
}));

app.get("/api/admin/kpi", wrap(async (_req, res) => {
  const [today] = await q(
    `SELECT COALESCE(SUM(total_rent),0) AS gross, COALESCE(SUM(advance_paid),0) AS collected
       FROM bookings WHERE DATE(created_at) = CURDATE()`,
  );
  const [active] = await q("SELECT COUNT(*) AS n FROM bookings WHERE rental_status IN ('Reserved','On-Set','Overdue')");
  const [overdue] = await q("SELECT COUNT(*) AS n FROM bookings WHERE rental_status = 'Overdue'");
  const [advances] = await q("SELECT COALESCE(SUM(advance_paid),0) AS v FROM bookings");
  const [onSet] = await q("SELECT COALESCE(SUM(replacement_value),0) AS v FROM props WHERE status = 'On-Set'");
  const [warehouse] = await q("SELECT COALESCE(SUM(replacement_value),0) AS v FROM props");
  const [outstanding] = await q("SELECT COALESCE(SUM(balance_due),0) AS v FROM bookings WHERE rental_status <> 'Returned'");
  const [deposits] = await q("SELECT COALESCE(SUM(security_deposit),0) AS v FROM bookings WHERE deposit_status = 'Held'");
  const trend = await q(
    `SELECT DATE_FORMAT(created_at, '%b %d') AS label,
            COALESCE(SUM(total_rent),0) AS revenue,
            COALESCE(SUM(total_rent),0) * 0.42 AS profit
       FROM bookings
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at) ORDER BY DATE(created_at)`,
  );
  res.json({
    gross_revenue_today: num(today?.gross),
    net_profit_today: Math.round(num(today?.gross) * 0.42),
    active_rentals: num(active?.n),
    overdue_rentals: num(overdue?.n),
    advances_collected: num(advances?.v),
    on_set_inventory_value: num(onSet?.v),
    warehouse_valuation: num(warehouse?.v),
    outstanding_balances: num(outstanding?.v),
    held_deposits: num(deposits?.v),
    revenue_trend: trend.map((t) => ({ label: t.label, revenue: num(t.revenue), profit: Math.round(num(t.profit)) })),
  });
}));

app.post("/api/bookings", wrap(async (req, res) => {
  const d = req.body ?? {};
  const required = ["prop_id", "production_house", "contact_person", "start_date", "wrap_date"];
  const missing = required.filter((k) => !d[k]);
  if (missing.length) return res.status(400).json({ error: `Missing: ${missing.join(", ")}` });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [clientRows] = await conn.execute(
      "SELECT id FROM clients WHERE production_house = ? LIMIT 1",
      [d.production_house],
    );
    let clientId = clientRows[0]?.id;
    if (!clientId) {
      const [ins] = await conn.execute(
        "INSERT INTO clients (production_house, contact_person, phone) VALUES (?, ?, ?)",
        [d.production_house, d.contact_person, d.phone ?? null],
      );
      clientId = ins.insertId;
    }

    const [prop] = await conn.execute("SELECT id, title, daily_rate FROM props WHERE id = ?", [d.prop_id]);
    if (!prop[0]) throw new Error("Prop not found");

    const booking_code = `SCP-BK-${Date.now().toString().slice(-6)}`;
    const [b] = await conn.execute(
      `INSERT INTO bookings (booking_code, client_id, start_date, wrap_date, total_rent, security_deposit,
                             advance_paid, balance_due, deposit_status, rental_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Held', 'Reserved')`,
      [booking_code, clientId, d.start_date, d.wrap_date, num(d.total_rent), num(d.security_deposit),
       num(d.advance_paid), num(d.balance_due)],
    );
    await conn.execute(
      `INSERT INTO booking_items (booking_id, prop_id, prop_title, applied_daily_rate, quantity)
       VALUES (?, ?, ?, ?, 1)`,
      [b.insertId, prop[0].id, prop[0].title, prop[0].daily_rate],
    );
    await conn.execute("UPDATE props SET status = 'Booked' WHERE id = ?", [prop[0].id]);
    await conn.commit();
    res.json({ booking_code });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}));

const RENTAL_STATUSES = ["Reserved", "On-Set", "Returned", "Inspecting", "Overdue", "Damaged"];

app.patch("/api/bookings/:id/status", wrap(async (req, res) => {
  const status = req.body?.rental_status;
  if (!RENTAL_STATUSES.includes(status)) return res.status(400).json({ error: "Invalid rental_status" });
  await q("UPDATE bookings SET rental_status = :s WHERE id = :id", { s: status, id: Number(req.params.id) });
  const propStatus = status === "On-Set" ? "On-Set" : status === "Returned" ? "In-Stock" : null;
  if (propStatus) {
    await q(
      `UPDATE props SET status = :ps WHERE id IN (SELECT prop_id FROM booking_items WHERE booking_id = :id)`,
      { ps: propStatus, id: Number(req.params.id) },
    );
  }
  res.json({ ok: true });
}));

app.post("/api/bookings/:id/refund-deposit", wrap(async (req, res) => {
  await q("UPDATE bookings SET deposit_status = 'Refunded' WHERE id = :id", { id: Number(req.params.id) });
  res.json({ ok: true });
}));

app.post("/api/props", wrap(async (req, res) => {
  const p = req.body ?? {};
  if (!p.title || !p.serial_number || !p.category_id) {
    return res.status(400).json({ error: "title, serial_number and category_id are required" });
  }
  await q(
    `INSERT INTO props (serial_number, title, category_id, genre_tags, daily_rate, weekly_rate, security_deposit,
                        replacement_value, condition_rating, status, image_urls, description, qr_code_id)
     VALUES (:serial_number, :title, :category_id, :genre_tags, :daily_rate, :weekly_rate, :security_deposit,
             :replacement_value, :condition_rating, :status, :image_urls, :description, :qr_code_id)`,
    {
      serial_number: p.serial_number,
      title: p.title,
      category_id: Number(p.category_id),
      genre_tags: JSON.stringify(p.genre_tags ?? []),
      daily_rate: num(p.daily_rate),
      weekly_rate: num(p.weekly_rate),
      security_deposit: num(p.security_deposit),
      replacement_value: num(p.replacement_value),
      condition_rating: p.condition_rating ?? "Good",
      status: p.status ?? "In-Stock",
      image_urls: JSON.stringify(p.image_urls ?? []),
      description: p.description ?? "",
      qr_code_id: p.qr_code_id ?? `QR-${p.serial_number}`,
    },
  );
  res.json({ ok: true });
}));

const port = Number(process.env.PORT ?? 5000);

/* ---------------- Clients ---------------- */

app.post("/api/clients", wrap(async (req, res) => {
  const c = req.body ?? {};
  if (!c.production_house || !c.contact_person) {
    return res.status(400).json({ error: "production_house and contact_person are required" });
  }
  const rows = await q(
    `INSERT INTO clients (production_house, contact_person, email, phone, gst_number, address)
     VALUES (:production_house, :contact_person, :email, :phone, :gst_number, :address)`,
    {
      production_house: c.production_house,
      contact_person: c.contact_person,
      email: c.email ?? null,
      phone: c.phone ?? null,
      gst_number: c.gst_number ?? null,
      address: c.address ?? null,
    },
  );
  res.json({ id: rows.insertId, ...c });
}));

/* ---------------- Props CRUD ---------------- */

app.put("/api/props/:id", wrap(async (req, res) => {
  const p = req.body ?? {};
  await q(
    `UPDATE props SET title = :title, category_id = :category_id, genre_tags = :genre_tags,
            daily_rate = :daily_rate, weekly_rate = :weekly_rate, security_deposit = :security_deposit,
            replacement_value = :replacement_value, condition_rating = :condition_rating,
            status = :status, image_urls = :image_urls, description = :description
      WHERE id = :id`,
    {
      id: Number(req.params.id),
      title: p.title,
      category_id: Number(p.category_id),
      genre_tags: JSON.stringify(p.genre_tags ?? []),
      daily_rate: num(p.daily_rate),
      weekly_rate: num(p.weekly_rate),
      security_deposit: num(p.security_deposit),
      replacement_value: num(p.replacement_value),
      condition_rating: p.condition_rating ?? "Good",
      status: p.status ?? "In-Stock",
      image_urls: JSON.stringify(p.image_urls ?? []),
      description: p.description ?? "",
    },
  );
  res.json({ ok: true });
}));

app.delete("/api/props/:id", wrap(async (req, res) => {
  await q("DELETE FROM props WHERE id = :id", { id: Number(req.params.id) });
  res.json({ ok: true });
}));

const PROP_STATUSES = ["In-Stock", "On-Set", "Booked", "Maintenance"];

app.patch("/api/props/:id/status", wrap(async (req, res) => {
  const status = req.body?.status;
  if (!PROP_STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status" });
  await q("UPDATE props SET status = :s WHERE id = :id", { s: status, id: Number(req.params.id) });
  res.json({ ok: true });
}));

/* ---------------- Invoices & Quotations ---------------- */

app.get("/api/invoices", wrap(async (_req, res) => {
  const invoices = await q("SELECT * FROM invoices ORDER BY id DESC LIMIT 200");
  const items = invoices.length ? await q("SELECT * FROM invoice_items") : [];
  res.json(invoices.map((v) => ({
    id: v.id,
    invoice_number: v.invoice_number,
    doc_type: v.doc_type,
    client_id: v.client_id,
    client_name: v.client_name,
    client_phone: v.client_phone,
    production_house: v.production_house ?? "",
    shoot_location: v.shoot_location ?? undefined,
    shoot_start_date: new Date(v.shoot_start_date).toISOString().slice(0, 10),
    shoot_wrap_date: new Date(v.shoot_wrap_date).toISOString().slice(0, 10),
    items: items.filter((i) => i.invoice_id === v.id).map((i) => ({
      prop_id: i.prop_id,
      prop_name: i.prop_name,
      serial_number: i.serial_number ?? "",
      condition_rating: i.condition_rating ?? "Good",
      quantity: i.quantity,
      number_of_days: i.number_of_days,
      custom_daily_rate: num(i.custom_daily_rate),
      total_price: num(i.total_price),
    })),
    subtotal: num(v.subtotal),
    discount: num(v.discount),
    transport_charges: num(v.transport_charges),
    gst_percent: num(v.gst_percent),
    gst_amount: num(v.gst_amount),
    security_deposit: num(v.security_deposit),
    advance_received: num(v.advance_received),
    balance_payable: num(v.balance_payable),
    payment_status: v.payment_status,
    notes: v.notes ?? undefined,
    created_at: new Date(v.created_at).toISOString(),
  })));
}));

app.post("/api/invoices", wrap(async (req, res) => {
  const d = req.body ?? {};
  if (!d.invoice_number || !Array.isArray(d.items) || d.items.length === 0) {
    return res.status(400).json({ error: "invoice_number and at least one line item are required" });
  }
  const docType = d.doc_type === "QUOTATION" ? "QUOTATION" : "INVOICE";

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [ins] = await conn.execute(
      `INSERT INTO invoices (invoice_number, doc_type, client_id, client_name, client_phone, production_house,
                             shoot_location, shoot_start_date, shoot_wrap_date, subtotal, discount, gst_percent,
                             gst_amount, transport_charges, security_deposit, advance_received, balance_payable,
                             payment_status, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [d.invoice_number, docType, Number(d.client_id), d.client_name, d.client_phone, d.production_house ?? null,
       d.shoot_location ?? null, d.shoot_start_date, d.shoot_wrap_date, num(d.subtotal), num(d.discount),
       num(d.gst_percent), num(d.gst_amount), num(d.transport_charges), num(d.security_deposit),
       num(d.advance_received), num(d.balance_payable), d.payment_status ?? "Pending", d.notes ?? null],
    );
    const invoiceId = ins.insertId;

    for (const i of d.items) {
      await conn.execute(
        `INSERT INTO invoice_items (invoice_id, prop_id, prop_name, serial_number, condition_rating,
                                    quantity, number_of_days, custom_daily_rate, total_price)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [invoiceId, Number(i.prop_id), i.prop_name, i.serial_number ?? null, i.condition_rating ?? null,
         Number(i.quantity ?? 1), Number(i.number_of_days ?? 1), num(i.custom_daily_rate), num(i.total_price)],
      );
    }

    // Only a real invoice locks inventory and opens a rental order.
    if (docType === "INVOICE") {
      const booking_code = `SCP-BK-${Date.now().toString().slice(-6)}`;
      const [b] = await conn.execute(
        `INSERT INTO bookings (booking_code, client_id, start_date, wrap_date, total_rent, security_deposit,
                               advance_paid, balance_due, deposit_status, rental_status)
         VALUES (?,?,?,?,?,?,?,?, 'Held', 'Reserved')`,
        [booking_code, Number(d.client_id), d.shoot_start_date, d.shoot_wrap_date,
         num(d.subtotal) + num(d.gst_amount) + num(d.transport_charges) - num(d.discount),
         num(d.security_deposit), num(d.advance_received), num(d.balance_payable)],
      );
      for (const i of d.items) {
        await conn.execute(
          `INSERT INTO booking_items (booking_id, prop_id, prop_title, applied_daily_rate, quantity)
           VALUES (?,?,?,?,?)`,
          [b.insertId, Number(i.prop_id), i.prop_name, num(i.custom_daily_rate), Number(i.quantity ?? 1)],
        );
        await conn.execute("UPDATE props SET status = 'Booked' WHERE id = ?", [Number(i.prop_id)]);
      }
      await conn.commit();
      conn.release();
      return res.json({ id: invoiceId, invoice_number: d.invoice_number, booking_code });
    }

    await conn.commit();
    res.json({ id: invoiceId, invoice_number: d.invoice_number });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    if (!conn.connection?._closing) { try { conn.release(); } catch { /* already released */ } }
  }
}));

app.listen(port, () => console.log(`Surya Cine Props API listening on :${port}`));