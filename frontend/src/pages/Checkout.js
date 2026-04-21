import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  createFeedback,
  createOrder,
  createPaymentOrder,
  getDeliveryOptions,
  verifyPaymentOrder,
} from "../services/api";

const initialFormState = {
  name: "",
  phone: "",
  address: "",
  city: "",
  pincode: "",
  occasion: "birthday",
  gift_message: "",
  delivery_date: "",
  delivery_slot: "",
};

const initialFeedbackFormState = {
  rating: "5",
  title: "",
  message: "",
};

const RAZORPAY_CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

const occasionOptions = [
  { value: "birthday", label: "Birthday" },
  { value: "anniversary", label: "Anniversary" },
  { value: "thank_you", label: "Thank You" },
  { value: "just_because", label: "Just Because" },
];

const formatDisplayDate = (value) => {
  if (!value) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
};

const loadRazorpayScript = () =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Razorpay is only available in the browser."));
      return;
    }

    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    const existingScript = document.querySelector(`script[src="${RAZORPAY_CHECKOUT_SCRIPT}"]`);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.Razorpay), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Unable to load Razorpay checkout.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout."));
    document.body.appendChild(script);
  });

function Field({ label, name, value, onChange, type = "text", required = false, min, maxLength }) {
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
        min={min}
        maxLength={maxLength}
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
          {item.purchaseType ? ` | ${item.purchaseType[0].toUpperCase()}${item.purchaseType.slice(1)}` : ""}
        </p>
      </div>
      <p className="summary-price">Rs. {lineTotal.toLocaleString()}</p>
    </div>
  );
}

export default function Checkout({ cart = [], clearCart = () => {}, authUser = null }) {
  const [form, setForm] = useState(initialFormState);
  const [paymentMethod, setPaymentMethod] = useState("ONLINE");
  const [loading, setLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [deliveryOptions, setDeliveryOptions] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState(initialFeedbackFormState);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackError, setFeedbackError] = useState("");

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0),
    [cart]
  );

  const minSelectableDate = useMemo(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  }, []);

  const selectedSlot = useMemo(
    () => (deliveryOptions?.slots || []).find((slot) => slot.code === form.delivery_slot) || null,
    [deliveryOptions, form.delivery_slot]
  );

  const sameDaySelected = Boolean(
    deliveryOptions?.same_day_available &&
      form.delivery_date &&
      deliveryOptions?.selected_date === form.delivery_date
  );

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      setScheduleLoading(true);
      try {
        const response = await getDeliveryOptions(form.delivery_date || undefined);
        if (!active) {
          return;
        }

        const data = response.data;
        setDeliveryOptions(data);

        setForm((current) => {
          const nextDate = current.delivery_date || data.selected_date || "";
          const availableSlots = (data.slots || []).filter((slot) => slot.available);
          const nextSlot = availableSlots.some((slot) => slot.code === current.delivery_slot)
            ? current.delivery_slot
            : availableSlots[0]?.code || "";

          return {
            ...current,
            delivery_date: nextDate,
            delivery_slot: nextSlot,
          };
        });

        if (!form.delivery_date && data.selected_date && !data.same_day_available) {
          const hasTodaySlots = (data.slots || []).some((slot) => slot.available);
          if (!hasTodaySlots) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setForm((current) => ({
              ...current,
              delivery_date: tomorrow.toISOString().slice(0, 10),
            }));
          }
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError?.response?.data?.error || "We could not load delivery slots right now."
          );
        }
      } finally {
        if (active) {
          setScheduleLoading(false);
        }
      }
    };

    loadOptions();

    return () => {
      active = false;
    };
  }, [form.delivery_date]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
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

    if (!form.delivery_date) {
      setError("Choose a delivery date.");
      return false;
    }

    if (!form.delivery_slot) {
      setError("Choose an available delivery time slot.");
      return false;
    }

    if (form.gift_message.trim().length > 300) {
      setError("Gift message should stay within 300 characters.");
      return false;
    }

    if (cart.length === 0) {
      setError("Your cart is empty. Add some flowers first.");
      return false;
    }

    return true;
  };

  const buildOrderPayload = () => ({
    ...form,
    items: cart,
    same_day_delivery: sameDaySelected,
    status: "Pending",
    payment_method: paymentMethod,
    payment_status: paymentMethod === "ONLINE" ? "PAID" : "UNPAID",
  });

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
      let response;

      if (paymentMethod === "ONLINE") {
        const Razorpay = await loadRazorpayScript();
        if (!Razorpay) {
          throw new Error("Razorpay checkout is unavailable right now.");
        }

        const paymentOrderResponse = await createPaymentOrder(Math.round(total * 100));
        const paymentOrder = paymentOrderResponse.data || {};
        const orderPayload = buildOrderPayload();

        response = await new Promise((resolve, reject) => {
          const razorpayInstance = new Razorpay({
            key: paymentOrder.key,
            amount: paymentOrder.amount,
            currency: paymentOrder.currency || "INR",
            name: "Petals & Floras",
            description: "Floral order payment",
            order_id: paymentOrder.id,
            prefill: {
              name: form.name || authUser?.name || "",
              email: authUser?.email || "",
              contact: form.phone || "",
            },
            notes: {
              delivery_date: form.delivery_date || "",
              delivery_slot: selectedSlot?.label || form.delivery_slot || "",
            },
            theme: {
              color: "#d94969",
            },
            handler: async (paymentResult) => {
              try {
                const verifyResponse = await verifyPaymentOrder({
                  ...orderPayload,
                  payment_method: "ONLINE",
                  payment_status: "PAID",
                  payment_order_id: paymentResult.razorpay_order_id,
                  payment_id: paymentResult.razorpay_payment_id,
                  payment_signature: paymentResult.razorpay_signature,
                });
                resolve(verifyResponse);
              } catch (verificationError) {
                reject(verificationError);
              }
            },
            modal: {
              ondismiss: () => reject(new Error("Payment was cancelled before completion.")),
            },
          });

          razorpayInstance.on("payment.failed", (event) => {
            reject(new Error(event?.error?.description || "Payment failed. Please try again."));
          });

          razorpayInstance.open();
        });
      } else {
        response = await createOrder({
          ...buildOrderPayload(),
          payment_method: "COD",
          payment_status: "UNPAID",
        });
      }

      setPlacedOrder(response.data || null);
      setMessage(response.data?.message || "Order placed successfully.");
      setFeedbackForm(initialFeedbackFormState);
      setFeedbackMessage("");
      setFeedbackError("");
      setSuccess(true);
      setForm((current) => ({
        ...initialFormState,
        delivery_date: current.delivery_date,
        delivery_slot: current.delivery_slot,
      }));
      setPaymentMethod("ONLINE");
      clearCart();
    } catch (requestError) {
      setError(
        requestError?.message ||
        requestError?.response?.data?.error ||
          requestError?.response?.data?.message ||
          "Failed to place order."
      );
    } finally {
      setLoading(false);
    }
  };

  const submitPostOrderFeedback = async () => {
    setFeedbackError("");
    setFeedbackMessage("");

    if (!feedbackForm.title.trim() || !feedbackForm.message.trim()) {
      setFeedbackError("Please add a feedback title and message.");
      return;
    }

    try {
      setFeedbackLoading(true);
      await createFeedback({
        target_type: "shop",
        product_id: null,
        rating: Number(feedbackForm.rating),
        title: feedbackForm.title.trim(),
        message: feedbackForm.message.trim(),
      });
      setFeedbackMessage("Thank you. Your feedback was shared successfully.");
      setFeedbackForm(initialFeedbackFormState);
    } catch (requestError) {
      setFeedbackError(
        requestError?.response?.data?.error ||
          requestError?.response?.data?.message ||
          "We could not save your feedback right now."
      );
    } finally {
      setFeedbackLoading(false);
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
          width: min(1180px, 100%);
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.18fr 0.82fr;
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
          margin: 0 0 0.55rem;
          font-size: 2rem;
          font-weight: 700;
        }
        .checkout-lead {
          margin: 0 0 1.5rem;
          line-height: 1.7;
          color: rgba(255,255,255,0.72);
        }
        .checkout-subtitle {
          margin: 0 0 1rem;
          font-size: 1.1rem;
          font-weight: 600;
        }
        .checkout-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }
        .checkout-field {
          display: grid;
          gap: 0.45rem;
          margin-bottom: 1rem;
        }
        .checkout-field.full {
          grid-column: 1 / -1;
        }
        .checkout-label {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.78);
        }
        .checkout-input,
        .checkout-select,
        .checkout-textarea {
          width: 100%;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          color: #fff;
          border-radius: 16px;
          padding: 0.95rem 1rem;
          outline: none;
          font: inherit;
        }
        .checkout-select option {
          color: #120209;
        }
        .checkout-textarea {
          min-height: 118px;
          resize: vertical;
        }
        .checkout-input:focus,
        .checkout-select:focus,
        .checkout-textarea:focus {
          border-color: rgba(232, 83, 109, 0.7);
          box-shadow: 0 0 0 3px rgba(232, 83, 109, 0.14);
        }
        .delivery-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.65rem 0.9rem;
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.14);
          border: 1px solid rgba(74, 222, 128, 0.34);
          color: #bbf7d0;
          font-size: 0.86rem;
          margin-bottom: 1rem;
        }
        .delivery-note {
          margin: 0 0 1rem;
          color: rgba(255,255,255,0.7);
          line-height: 1.6;
          font-size: 0.92rem;
        }
        .slot-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.85rem;
          margin-bottom: 1rem;
        }
        .slot-card {
          text-align: left;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.05);
          padding: 1rem;
          color: #fff;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }
        .slot-card strong {
          display: block;
          margin-bottom: 0.35rem;
        }
        .slot-card span {
          display: block;
          color: rgba(255,255,255,0.7);
          font-size: 0.84rem;
          line-height: 1.5;
        }
        .slot-card.active {
          background: linear-gradient(135deg, rgba(217, 73, 105, 0.26), rgba(142, 28, 54, 0.34));
          border-color: rgba(244, 114, 182, 0.52);
          transform: translateY(-2px);
        }
        .slot-card.disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
        .payment-method-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.9rem;
          margin-bottom: 1.2rem;
        }
        .payment-method-card {
          text-align: left;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.05);
          padding: 1rem;
          color: #fff;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }
        .payment-method-card.active {
          background: linear-gradient(135deg, rgba(217, 73, 105, 0.26), rgba(142, 28, 54, 0.34));
          border-color: rgba(244, 114, 182, 0.52);
          transform: translateY(-2px);
        }
        .payment-method-card strong {
          display: block;
          margin-bottom: 0.35rem;
        }
        .payment-method-card span {
          display: block;
          color: rgba(255,255,255,0.68);
          font-size: 0.84rem;
          line-height: 1.5;
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
        .summary-total,
        .summary-line {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.9rem;
          padding-top: 0.85rem;
          margin-top: 0.85rem;
          border-top: 1px solid rgba(255,255,255,0.1);
        }
        .summary-line p,
        .summary-line strong {
          margin: 0;
        }
        .summary-line > div {
          display: grid;
          gap: 0.3rem;
          min-width: 0;
          flex: 1;
        }
        .summary-line > div strong,
        .summary-line > div span {
          display: block;
        }
        .summary-line > span {
          display: block;
          max-width: 48%;
          text-align: right;
        }
        .summary-line span {
          color: rgba(255,255,255,0.68);
          font-size: 0.88rem;
          line-height: 1.55;
        }
        .summary-total {
          font-size: 1.05rem;
          font-weight: 700;
        }
        .summary-empty {
          color: rgba(255,255,255,0.64);
        }
        .summary-note {
          margin-top: 1.2rem;
          padding: 1rem 1.05rem;
          border-radius: 18px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.72);
          line-height: 1.6;
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
          width: min(620px, calc(100vw - 2rem));
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
        .success-actions {
          display: flex;
          gap: 0.8rem;
          margin-top: 1.25rem;
          flex-wrap: wrap;
          justify-content: center;
        }
        .success-link {
          min-width: 180px;
          border-radius: 999px;
          padding: 0.95rem 1.2rem;
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-size: 0.82rem;
        }
        .success-link.primary {
          background: linear-gradient(135deg, #d94969, #8e1c36);
          color: #fff;
          box-shadow: 0 16px 30px rgba(217, 73, 105, 0.24);
        }
        .success-link.secondary {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.85);
          border: 1px solid rgba(255,255,255,0.14);
        }
        .post-feedback-panel {
          margin-top: 1.4rem;
          padding: 1.25rem;
          border-radius: 20px;
          text-align: left;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .post-feedback-title {
          margin: 0 0 0.35rem;
          color: #fff;
          font-size: 1.08rem;
          font-weight: 700;
        }
        .post-feedback-copy {
          margin: 0 0 1rem;
          color: rgba(255,255,255,0.68);
          line-height: 1.6;
          font-size: 0.9rem;
        }
        .post-feedback-rating {
          display: flex;
          gap: 0.55rem;
          flex-wrap: wrap;
          margin-bottom: 0.95rem;
        }
        .post-feedback-pill {
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.82);
          padding: 0.6rem 0.9rem;
          border-radius: 999px;
          cursor: pointer;
          font: inherit;
          transition: transform 0.18s, background 0.18s, border-color 0.18s;
        }
        .post-feedback-pill:hover {
          transform: translateY(-1px);
          background: rgba(255,255,255,0.09);
        }
        .post-feedback-pill.active {
          color: #fff;
          border-color: rgba(232,83,109,0.7);
          background: linear-gradient(135deg, #d94969, #8e1c36);
        }
        .post-feedback-field {
          width: 100%;
          margin-bottom: 0.85rem;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.05);
          color: #fff;
          padding: 0.95rem 1rem;
          font: inherit;
          outline: none;
        }
        .post-feedback-field::placeholder {
          color: rgba(255,255,255,0.42);
        }
        .post-feedback-field:focus {
          border-color: rgba(232,83,109,0.5);
          box-shadow: 0 0 0 3px rgba(217,73,105,0.14);
        }
        .post-feedback-field.textarea {
          min-height: 120px;
          resize: vertical;
        }
        .post-feedback-submit {
          width: 100%;
          border: none;
          border-radius: 999px;
          padding: 0.92rem 1.1rem;
          background: linear-gradient(135deg, #d94969, #8e1c36);
          color: #fff;
          font: inherit;
          font-size: 0.86rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .post-feedback-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .post-feedback-status {
          margin-top: 0.8rem;
          padding: 0.8rem 0.9rem;
          border-radius: 14px;
          font-size: 0.88rem;
          line-height: 1.5;
        }
        .post-feedback-status.success {
          background: rgba(34,197,94,0.12);
          border: 1px solid rgba(34,197,94,0.24);
          color: #bbf7d0;
        }
        .post-feedback-status.error {
          background: rgba(239,68,68,0.12);
          border: 1px solid rgba(239,68,68,0.24);
          color: #fecaca;
        }
        @media (max-width: 960px) {
          .checkout-shell {
            grid-template-columns: 1fr;
          }
          .slot-grid {
            grid-template-columns: 1fr;
          }
          .payment-method-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .checkout-page {
            padding: calc(var(--nav-height) + 1.25rem) 0.85rem 3.5rem;
          }
          .checkout-card {
            padding: 1.2rem;
            border-radius: 22px;
          }
          .success-card {
            padding: 1.2rem;
          }
          .checkout-grid {
            grid-template-columns: 1fr;
          }
          .checkout-title {
            font-size: 1.7rem;
          }
          .summary-row,
          .summary-total,
          .summary-line {
            flex-wrap: wrap;
          }
          .summary-line > span {
            max-width: 100%;
            text-align: left;
          }
          .summary-price {
            width: 100%;
            text-align: left;
          }
        }
      `}</style>

      <section className="checkout-page">
        <div className="checkout-shell">
          <div className="checkout-card">
            <h1 className="checkout-title">Schedule A Meaningful Delivery</h1>
            <p className="checkout-lead">
              Pick the moment, add a heartfelt note, and let us handle the gentle details from bouquet prep to doorstep delivery.
            </p>

            {sameDaySelected ? (
              <div className="delivery-badge">Same-Day Delivery Available before 2:00 PM</div>
            ) : null}

            <div className="checkout-grid">
              <Field label="Full Name" name="name" value={form.name} onChange={handleChange} required />
              <Field label="Phone Number" name="phone" value={form.phone} onChange={handleChange} type="tel" required maxLength={10} />
              <div className="checkout-field full">
                <span className="checkout-label">Street Address *</span>
                <input className="checkout-input" name="address" value={form.address} onChange={handleChange} />
              </div>
              <Field label="City" name="city" value={form.city} onChange={handleChange} />
              <Field label="Pincode" name="pincode" value={form.pincode} onChange={handleChange} maxLength={6} />
              <div className="checkout-field">
                <span className="checkout-label">Occasion</span>
                <select className="checkout-select" name="occasion" value={form.occasion} onChange={handleChange}>
                  {occasionOptions.map((occasion) => (
                    <option key={occasion.value} value={occasion.value}>
                      {occasion.label}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                label="Delivery Date"
                name="delivery_date"
                type="date"
                value={form.delivery_date}
                onChange={handleChange}
                required
                min={minSelectableDate}
              />
            </div>

            <h2 className="checkout-subtitle">Choose a payment method</h2>
            <div className="payment-method-grid">
              <button
                type="button"
                className={`payment-method-card ${paymentMethod === "ONLINE" ? "active" : ""}`}
                onClick={() => setPaymentMethod("ONLINE")}
              >
                <strong>Pay Online</strong>
                <span>Secure Razorpay checkout with UPI, cards, net banking, and wallets.</span>
              </button>
              <button
                type="button"
                className={`payment-method-card ${paymentMethod === "COD" ? "active" : ""}`}
                onClick={() => setPaymentMethod("COD")}
              >
                <strong>Cash On Delivery</strong>
                <span>Place the order now and pay when the bouquet reaches you.</span>
              </button>
            </div>

            <h2 className="checkout-subtitle">Choose a delivery window</h2>
            <p className="delivery-note">
              {scheduleLoading
                ? "Checking florist capacity and same-day availability..."
                : "Slots update dynamically based on order load and same-day cutoff timing."}
            </p>

            <div className="slot-grid">
              {(deliveryOptions?.slots || []).map((slot) => (
                <button
                  key={slot.code}
                  type="button"
                  className={`slot-card ${form.delivery_slot === slot.code ? "active" : ""} ${slot.available ? "" : "disabled"}`}
                  onClick={() => {
                    if (!slot.available) {
                      return;
                    }
                    setForm((current) => ({ ...current, delivery_slot: slot.code }));
                  }}
                  disabled={!slot.available}
                >
                  <strong>{slot.label}</strong>
                  <span>{slot.window}</span>
                  <span>
                    {slot.available
                      ? `${slot.remaining_capacity} delivery spots left`
                      : slot.reason || "Unavailable"}
                  </span>
                </button>
              ))}
            </div>

            <div className="checkout-field">
              <span className="checkout-label">Gift Message</span>
              <textarea
                className="checkout-textarea"
                name="gift_message"
                value={form.gift_message}
                onChange={handleChange}
                placeholder="Write a note that will travel with the bouquet..."
                maxLength={300}
              />
            </div>

            <button className="checkout-button" type="button" onClick={placeOrder} disabled={loading || scheduleLoading}>
              {loading ? (paymentMethod === "ONLINE" ? "Starting Payment..." : "Placing Order...") : paymentMethod === "ONLINE" ? "Pay & Place Order" : "Place Order (COD)"}
            </button>

            <p className="checkout-note">
              {paymentMethod === "ONLINE"
                ? "Your order is created only after Razorpay confirms the payment. You will see live delivery updates in My Orders right after checkout."
                : "Cash on delivery stays available, and your delivery updates will still appear in My Orders after you place the order."}
            </p>

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
                    <SummaryRow key={item.cartKey || `${item.id}-${item.purchaseType || "flower"}`} item={item} />
                  ))}
                </div>
                <div className="summary-line">
                  <div>
                    <strong>Delivery Moment</strong>
                    <span>{form.delivery_date ? formatDisplayDate(form.delivery_date) : "Choose a date"}</span>
                  </div>
                  <span>{selectedSlot?.label || "Choose a time slot"}</span>
                </div>
                <div className="summary-line">
                  <div>
                    <strong>Occasion</strong>
                    <span>{occasionOptions.find((item) => item.value === form.occasion)?.label || "Custom"}</span>
                  </div>
                  <span>{sameDaySelected ? "Same-Day Eligible" : "Scheduled Delivery"}</span>
                </div>
                <div className="summary-line">
                  <div>
                    <strong>Gift Message</strong>
                    <span>{form.gift_message.trim() || "No note added yet."}</span>
                  </div>
                </div>
                <div className="summary-total">
                  <span>Total</span>
                  <span>Rs. {total.toLocaleString()}</span>
                </div>
              </>
            )}
            <div className="summary-note">
              Real delivery tracking appears in <strong>My Orders</strong> after you place the order, including live status changes from bouquet prep to doorstep delivery.
            </div>
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
              <h3>Delivery Reserved</h3>
              <p>{message || "Your flower order has been placed successfully."}</p>
              <p style={{ marginTop: "0.75rem" }}>
                Order #{placedOrder?.admin_order_id || "-"} is scheduled for{" "}
                {placedOrder?.delivery_date ? formatDisplayDate(placedOrder.delivery_date) : "your chosen day"}{" "}
                during {placedOrder?.delivery_slot_label || selectedSlot?.label || "the selected slot"}.
              </p>
              <div className="success-actions">
                <Link to="/orders" className="success-link primary">
                  Track My Order
                </Link>
                <button className="success-link secondary" type="button" onClick={() => setSuccess(false)}>
                  Continue Shopping
                </button>
              </div>
              <div className="post-feedback-panel">
                <p className="post-feedback-title">Tell us how your order experience felt</p>
                <p className="post-feedback-copy">
                  If you have a minute, share a quick review while the details are still fresh.
                </p>
                <div className="post-feedback-rating">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      className={`post-feedback-pill ${Number(feedbackForm.rating) === rating ? "active" : ""}`}
                      onClick={() => setFeedbackForm((current) => ({ ...current, rating: String(rating) }))}
                    >
                      {rating} Star{rating !== 1 ? "s" : ""}
                    </button>
                  ))}
                </div>
                <input
                  className="post-feedback-field"
                  type="text"
                  placeholder="Feedback title"
                  value={feedbackForm.title}
                  onChange={(event) => setFeedbackForm((current) => ({ ...current, title: event.target.value }))}
                />
                <textarea
                  className="post-feedback-field textarea"
                  placeholder="Write your feedback here..."
                  value={feedbackForm.message}
                  onChange={(event) => setFeedbackForm((current) => ({ ...current, message: event.target.value }))}
                />
                <button
                  className="post-feedback-submit"
                  type="button"
                  onClick={submitPostOrderFeedback}
                  disabled={feedbackLoading}
                >
                  {feedbackLoading ? "Sending Feedback..." : "Submit Feedback"}
                </button>
                {feedbackMessage ? <div className="post-feedback-status success">{feedbackMessage}</div> : null}
                {feedbackError ? <div className="post-feedback-status error">{feedbackError}</div> : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
