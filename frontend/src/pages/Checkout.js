import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { createOrder } from "../services/api";

const initialFormState = {
  name: "",
  phone: "",
  address: "",
  city: "",
  pincode: "",
};

function Field({ label, name, value, onChange, type = "text", required = false }) {
  return (
    <label className="checkout-field">
      <span className="checkout-label">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        className="checkout-input"
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        autoComplete="off"
      />
    </label>
  );
}

function SummaryRow({ item }) {
  const quantity = Number(item.qty || 1);
  const lineTotal = Number(item.price || 0) * quantity;

  return (
    <div className="summary-row">
      <div>
        <p className="summary-name">{item.name}</p>
        <p className="summary-meta">
          Qty: {quantity}
          {item.category ? ` | ${item.category}` : ""}
        </p>
      </div>
      <p className="summary-price">Rs. {lineTotal.toLocaleString()}</p>
    </div>
  );
}

export default function Checkout({ cart = [], clearCart = () => {}, authUser = null }) {
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0),
    [cart]
  );

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const validate = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setError("Please fill all required fields.");
      return false;
    }

    if (form.name.trim().length < 2) {
      setError("Enter a valid full name.");
      return false;
    }

    if (!/^\d{10}$/.test(form.phone.trim())) {
      setError("Enter a valid 10-digit phone number.");
      return false;
    }

    if (form.address.trim().length < 5) {
      setError("Enter a valid street address.");
      return false;
    }

    if (form.pincode.trim() && !/^\d{6}$/.test(form.pincode.trim())) {
      setError("Enter a valid 6-digit pincode.");
      return false;
    }

    if (cart.length === 0) {
      setError("Your cart is empty. Add some flowers first.");
      return false;
    }

    return true;
  };

  const placeOrder = async () => {
    setError("");
    setMessage("");

    if (!authUser) {
      setError("Please login first to place your order.");
      return;
    }

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const response = await createOrder({
        ...form,
        items: cart,
        status: "Pending",
        payment_method: "COD",
        payment_status: "UNPAID",
      });

      setMessage(response.data?.message || "Order placed successfully.");
      setSuccess(true);
      setForm(initialFormState);
      clearCart();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.error ||
          requestError?.response?.data?.message ||
          "Failed to place order."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!authUser) {
    return (
      <>
        <style>{`
          .checkout-auth-wall {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: calc(var(--nav-height) + 2rem) 1rem 3rem;
            background:
              radial-gradient(circle at top, rgba(232, 83, 109, 0.24), transparent 32%),
              linear-gradient(180deg, #18040d 0%, #260714 100%);
          }
          .checkout-auth-card {
            width: min(100%, 520px);
            padding: 2rem;
            border-radius: 24px;
            background: rgba(60, 5, 20, 0.72);
            border: 1px solid rgba(255,255,255,0.12);
            color: #fff;
            text-align: center;
            box-shadow: 0 24px 60px rgba(0,0,0,0.36);
          }
          .checkout-auth-card h2 {
            font-size: clamp(2rem, 4vw, 2.8rem);
            margin-bottom: 0.8rem;
          }
          .checkout-auth-card p {
            color: rgba(255,255,255,0.74);
            line-height: 1.7;
            margin-bottom: 1.5rem;
          }
          .checkout-auth-actions {
            display: flex;
            gap: 0.8rem;
            justify-content: center;
            flex-wrap: wrap;
          }
          .checkout-auth-link {
            min-width: 170px;
            padding: 0.95rem 1.2rem;
            border-radius: 999px;
            text-decoration: none;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-size: 0.82rem;
          }
          .checkout-auth-link.primary {
            background: linear-gradient(135deg, #d94969, #8e1c36);
            color: #fff;
          }
          .checkout-auth-link.secondary {
            background: rgba(255,255,255,0.06);
            color: rgba(255,255,255,0.82);
            border: 1px solid rgba(255,255,255,0.16);
          }
        `}</style>

        <section className="checkout-auth-wall">
          <div className="checkout-auth-card">
            <h2>Login Required</h2>
            <p>Please login first to place an order. Once you sign in, you can continue checkout.</p>
            <div className="checkout-auth-actions">
              <Link to="/login" className="checkout-auth-link primary">Login</Link>
              <Link to="/cart" className="checkout-auth-link secondary">Back to Cart</Link>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <style>{`
        .checkout-page {
          min-height: 100vh;
          padding: calc(var(--nav-height) + 2.25rem) 1rem 4rem;
          background:
            radial-gradient(circle at top, rgba(232, 83, 109, 0.18), transparent 28%),
            linear-gradient(180deg, #18040d 0%, #260714 100%);
          color: #fff;
        }

        .checkout-shell {
          width: min(1080px, 100%);
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 1.5rem;
        }

        .checkout-card {
          background: rgba(60, 5, 20, 0.68);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 28px;
          padding: 2rem;
          box-shadow: 0 24px 60px rgba(0,0,0,0.34);
          backdrop-filter: blur(16px);
        }

        .checkout-title {
          margin: 0 0 1.5rem;
          font-size: 2rem;
          font-weight: 700;
        }

        .checkout-subtitle {
          margin: 0 0 1rem;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .checkout-field {
          display: grid;
          gap: 0.45rem;
          margin-bottom: 1rem;
        }

        .checkout-label {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.78);
        }

        .checkout-input {
          width: 100%;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          color: #fff;
          border-radius: 16px;
          padding: 0.95rem 1rem;
          outline: none;
          font: inherit;
        }

        .checkout-input:focus {
          border-color: rgba(232, 83, 109, 0.7);
          box-shadow: 0 0 0 3px rgba(232, 83, 109, 0.14);
        }

        .checkout-button {
          width: 100%;
          border: none;
          border-radius: 999px;
          padding: 1rem 1.15rem;
          color: #fff;
          background: linear-gradient(135deg, #d94969, #8e1c36);
          font: inherit;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 16px 30px rgba(217, 73, 105, 0.24);
        }

        .checkout-button:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .checkout-note {
          margin-top: 0.9rem;
          color: rgba(255,255,255,0.6);
          font-size: 0.88rem;
          line-height: 1.6;
        }

        .checkout-feedback {
          margin-top: 1rem;
          border-radius: 16px;
          padding: 0.9rem 1rem;
          font-size: 0.94rem;
        }

        .checkout-feedback.error {
          background: rgba(239, 68, 68, 0.14);
          border: 1px solid rgba(239, 68, 68, 0.32);
          color: #fecaca;
        }

        .checkout-feedback.success {
          background: rgba(34, 197, 94, 0.14);
          border: 1px solid rgba(34, 197, 94, 0.32);
          color: #bbf7d0;
        }

        .summary-list {
          display: grid;
          gap: 0.9rem;
        }

        .summary-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
          padding-bottom: 0.9rem;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .summary-name {
          margin: 0 0 0.2rem;
          font-weight: 600;
        }

        .summary-meta {
          margin: 0;
          color: rgba(255,255,255,0.62);
          font-size: 0.86rem;
        }

        .summary-price {
          margin: 0;
          font-weight: 700;
          white-space: nowrap;
        }

        .summary-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1.25rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255,255,255,0.12);
          font-size: 1.05rem;
          font-weight: 700;
        }

        .summary-empty {
          color: rgba(255,255,255,0.64);
        }

        .success-overlay {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(16, 2, 8, 0.72);
          backdrop-filter: blur(8px);
          z-index: 1000;
        }

        .success-card {
          width: min(420px, calc(100vw - 2rem));
          padding: 2rem;
          border-radius: 24px;
          background: rgba(60, 5, 20, 0.92);
          border: 1px solid rgba(255,255,255,0.12);
          text-align: center;
          box-shadow: 0 24px 60px rgba(0,0,0,0.4);
        }

        .success-card h3 {
          margin: 0 0 0.5rem;
          font-size: 1.8rem;
        }

        .success-card p {
          margin: 0;
          color: rgba(255,255,255,0.74);
          line-height: 1.7;
        }

        .success-card button {
          margin-top: 1.25rem;
        }

        @media (max-width: 860px) {
          .checkout-shell {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section className="checkout-page">
        <div className="checkout-shell">
          <div className="checkout-card">
            <h1 className="checkout-title">Delivery Details</h1>

            <Field label="Full Name" name="name" value={form.name} onChange={handleChange} required />
            <Field label="Phone Number" name="phone" value={form.phone} onChange={handleChange} type="tel" required />
            <Field label="Street Address" name="address" value={form.address} onChange={handleChange} required />
            <Field label="City" name="city" value={form.city} onChange={handleChange} />
            <Field label="Pincode" name="pincode" value={form.pincode} onChange={handleChange} />

            <button className="checkout-button" type="button" onClick={placeOrder} disabled={loading}>
              {loading ? "Placing Order..." : "Place Order (COD)"}
            </button>

            <p className="checkout-note">Online payment is disabled for now. Orders are placed as cash on delivery only.</p>

            {error ? <div className="checkout-feedback error">{error}</div> : null}
            {message && !success ? <div className="checkout-feedback success">{message}</div> : null}
          </div>

          <div className="checkout-card">
            <h2 className="checkout-subtitle">Order Summary</h2>

            {cart.length === 0 ? (
              <p className="summary-empty">No items in cart yet.</p>
            ) : (
              <>
                <div className="summary-list">
                  {cart.map((item) => (
                    <SummaryRow key={item.id} item={item} />
                  ))}
                </div>
                <div className="summary-total">
                  <span>Total</span>
                  <span>Rs. {total.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {success ? (
          <motion.div
            className="success-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSuccess(false)}
          >
            <motion.div
              className="success-card"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
            >
              <h3>Order Placed</h3>
              <p>{message || "Your COD order has been placed successfully."}</p>
              <button className="checkout-button" type="button" onClick={() => setSuccess(false)}>
                Continue Shopping
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
