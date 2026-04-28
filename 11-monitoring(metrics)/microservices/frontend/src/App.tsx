import { FormEvent, useState } from "react";
import { api } from "./api/client";
import { Panel } from "./components/Panel";
import { StatusBanner } from "./components/StatusBanner";
import { useResource } from "./hooks/useResource";
import type { Order, Payment, User } from "./types";

type Notice = { tone: "error" | "success"; message: string } | null;

export default function App() {
  const users = useResource<User[]>(api.listUsers);
  const orders = useResource<Order[]>(api.listOrders);
  const payments = useResource<Payment[]>(api.listPayments);
  const [notice, setNotice] = useState<Notice>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [userForm, setUserForm] = useState({ name: "", email: "" });
  const [orderForm, setOrderForm] = useState({ user_id: "", item: "", quantity: 1, amount: 99 });
  const [paymentForm, setPaymentForm] = useState({ orderId: "", amount: 99, method: "card" });

  const latestUsers = users.data ?? [];
  const latestOrders = orders.data ?? [];
  const latestPayments = payments.data ?? [];
  const totalOrderValue = latestOrders.reduce((sum, order) => sum + Number(order.amount), 0);
  const processedPayments = latestPayments.filter((payment) => payment.status === "processed").length;
  const deferredPayments = latestPayments.filter((payment) => payment.status === "deferred").length;

  const architectureCards = [
    {
      label: "User Service",
      stack: "Node.js / PostgreSQL",
      accent: "accent-sun",
      summary: `${latestUsers.length} registered users`
    },
    {
      label: "Order Service",
      stack: "FastAPI / Redis",
      accent: "accent-forest",
      summary: `${latestOrders.length} tracked orders`
    },
    {
      label: "Payment Service",
      stack: "Go / Circuit Breaker",
      accent: "accent-ocean",
      summary: `${processedPayments} processed payments`
    },
    {
      label: "Frontend",
      stack: "React / NGINX",
      accent: "accent-ember",
      summary: "Single LoadBalancer entrypoint"
    }
  ];

  async function refreshAll() {
    try {
      setIsRefreshing(true);
      await Promise.all([users.reload(), orders.reload(), payments.reload()]);
      setNotice({ tone: "success", message: "Dashboard data refreshed." });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to refresh dashboard."
      });
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api.createUser(userForm);
      setNotice({ tone: "success", message: "User created successfully." });
      setUserForm({ name: "", email: "" });
      await refreshAll();
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "User creation failed." });
    }
  }

  async function handleOrderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api.createOrder(orderForm);
      setNotice({ tone: "success", message: "Order created successfully." });
      setOrderForm({ user_id: "", item: "", quantity: 1, amount: 99 });
      await refreshAll();
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Order creation failed." });
    }
  }

  async function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api.createPayment(paymentForm);
      setNotice({ tone: "success", message: "Payment processed successfully." });
      setPaymentForm({ orderId: "", amount: 99, method: "card" });
      await refreshAll();
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Payment request failed." });
    }
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="hero__content">
          <div className="hero__headline">
            <p className="eyebrow">Cloud Native Operations Console</p>
            <h1>Four microservices, one sharp-looking control surface.</h1>
            <p className="hero__copy">
              Operate the full user, order, and payment lifecycle from a single interface designed for demos,
              screenshots, and stakeholder walkthroughs.
            </p>
          </div>
          <div className="hero__actions">
            <button className="hero__button" type="button" onClick={() => void refreshAll()} disabled={isRefreshing}>
              {isRefreshing ? "Refreshing..." : "Refresh live data"}
            </button>
            <p className="hero__meta">
              LoadBalancer ready frontend backed by 3 API services and shared observability.
            </p>
          </div>
        </div>

        <div className="hero__stats">
          <MetricCard value={latestUsers.length} label="Users" detail="Registered identities" />
          <MetricCard value={latestOrders.length} label="Orders" detail="FastAPI order flow" />
          <MetricCard value={`$${formatCompact(totalOrderValue)}`} label="Revenue" detail="Tracked order value" />
          <MetricCard value={processedPayments} label="Processed" detail="Successful payments" />
        </div>
      </header>

      <section className="architecture-strip">
        {architectureCards.map((card) => (
          <article key={card.label} className={`service-chip ${card.accent}`}>
            <p>{card.label}</p>
            <strong>{card.stack}</strong>
            <span>{card.summary}</span>
          </article>
        ))}
      </section>

      {notice ? <StatusBanner tone={notice.tone} message={notice.message} /> : null}

      <section className="overview-grid">
        <Panel title="Fleet Health" subtitle="At-a-glance state">
          <div className="overview-list">
            <OverviewRow
              label="User onboarding"
              value={latestUsers.length > 0 ? "Healthy" : "Awaiting first user"}
              detail={`${latestUsers.length} total users stored in PostgreSQL`}
            />
            <OverviewRow
              label="Order throughput"
              value={`${latestOrders.length} orders`}
              detail={`${formatCurrency(totalOrderValue)} total order value cached through Redis`}
            />
            <OverviewRow
              label="Payment resilience"
              value={`${processedPayments} processed`}
              detail={`${deferredPayments} deferred by retry and circuit logic`}
            />
          </div>
        </Panel>

        <Panel title="Deployment Story" subtitle="Demo talking points">
          <div className="story-grid">
            <div>
              <span>LoadBalancer</span>
              <p>Frontend is exposed through one external entrypoint for you and your friend to access together.</p>
            </div>
            <div>
              <span>Observability</span>
              <p>Prometheus, Grafana, and Alertmanager show request rate, latency, errors, and alerts.</p>
            </div>
            <div>
              <span>Resilience</span>
              <p>Payments include retry and circuit breaker behavior so failures are visible in demos.</p>
            </div>
          </div>
        </Panel>
      </section>

      <div className="grid">
        <Panel title="Users" subtitle="Node.js + PostgreSQL">
          <form className="form" onSubmit={handleUserSubmit}>
            <input
              placeholder="Full name"
              value={userForm.name}
              onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))}
            />
            <input
              type="email"
              placeholder="Email"
              value={userForm.email}
              onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
            />
            <button type="submit">Create user</button>
          </form>
          <DataState loading={users.loading} error={users.error} />
          <ul className="list">
            {latestUsers.map((user) => (
              <li key={user.id}>
                <div className="list__row">
                  <strong>{user.name}</strong>
                  <time>{formatDate(user.created_at)}</time>
                </div>
                <span>{user.email}</span>
                <code>{user.id}</code>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Orders" subtitle="FastAPI + Redis cache">
          <form className="form" onSubmit={handleOrderSubmit}>
            <select
              value={orderForm.user_id}
              onChange={(event) => setOrderForm((current) => ({ ...current, user_id: event.target.value }))}
            >
              <option value="">Select user</option>
              {latestUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Item"
              value={orderForm.item}
              onChange={(event) => setOrderForm((current) => ({ ...current, item: event.target.value }))}
            />
            <input
              type="number"
              min={1}
              value={orderForm.quantity}
              onChange={(event) =>
                setOrderForm((current) => ({ ...current, quantity: Number(event.target.value) }))
              }
            />
            <input
              type="number"
              min={1}
              step="0.01"
              value={orderForm.amount}
              onChange={(event) =>
                setOrderForm((current) => ({ ...current, amount: Number(event.target.value) }))
              }
            />
            <button type="submit">Create order</button>
          </form>
          <DataState loading={orders.loading} error={orders.error} />
          <ul className="list">
            {latestOrders.map((order) => (
              <li key={order.id}>
                <div className="list__row">
                  <strong>{order.item}</strong>
                  <StatusPill value={order.status} />
                </div>
                <span>
                  User {order.user_id.slice(0, 8)} - Qty {order.quantity} - {formatCurrency(order.amount)}
                </span>
                <code>{formatDate(order.created_at)}</code>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Payments" subtitle="Go + retries + circuit breaker">
          <form className="form" onSubmit={handlePaymentSubmit}>
            <select
              value={paymentForm.orderId}
              onChange={(event) => {
                const selected = latestOrders.find((order) => order.id === event.target.value);
                setPaymentForm((current) => ({
                  ...current,
                  orderId: event.target.value,
                  amount: selected ? selected.amount : current.amount
                }));
              }}
            >
              <option value="">Select order</option>
              {latestOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.item} - {order.id.slice(0, 8)}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              step="0.01"
              value={paymentForm.amount}
              onChange={(event) =>
                setPaymentForm((current) => ({ ...current, amount: Number(event.target.value) }))
              }
            />
            <select
              value={paymentForm.method}
              onChange={(event) => setPaymentForm((current) => ({ ...current, method: event.target.value }))}
            >
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="wallet">Wallet</option>
            </select>
            <button type="submit">Process payment</button>
          </form>
          <DataState loading={payments.loading} error={payments.error} />
          <ul className="list">
            {latestPayments.map((payment) => (
              <li key={payment.id}>
                <div className="list__row">
                  <strong>{payment.method.toUpperCase()}</strong>
                  <StatusPill value={payment.status} />
                </div>
                <span>
                  Order {payment.orderId.slice(0, 8)} - {formatCurrency(payment.amount)}
                </span>
                <code>{formatDate(payment.createdAt)}</code>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </main>
  );
}

function DataState({ loading, error }: { loading: boolean; error: string | null }) {
  if (loading) {
    return <p className="muted">Loading latest data...</p>;
  }

  if (error) {
    return <p className="muted muted--error">{error}</p>;
  }

  return null;
}

function MetricCard({ value, label, detail }: { value: number | string; label: string; detail: string }) {
  return (
    <div className="metric-card">
      <span>{value}</span>
      <strong>{label}</strong>
      <small>{detail}</small>
    </div>
  );
}

function OverviewRow({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="overview-row">
      <div>
        <strong>{label}</strong>
        <p>{detail}</p>
      </div>
      <span>{value}</span>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  return <span className={`status-pill status-pill--${value}`}>{value}</span>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}
