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
app.listen(port, () => console.log(`Surya Cine Props API listening on :${port}`));