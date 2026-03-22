import { useMemo, useState } from "react";
import { createOrder, createPaymentOrder } from "../services/api";

const initialFormState = {
  name: "",
  phone: "",
  address: "",
  city: "",
  pincode: "",
};

function Checkout({ cart, clearCart }) {
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const total = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1),
        0
      ),
    [cart]
  );

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setError("Please fill all required fields.");
      return false;
    }

    if (!/^\d{10}$/.test(form.phone.trim())) {
      setError("Invalid phone number.");
      return false;
    }

    if (cart.length === 0) {
      setError("Cart is empty. Please add products before checkout.");
      return false;
    }

    return true;
  };

  const placeOrder = async () => {
    setError("");
    setMessage("");
    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        ...form,
        items: cart,
      };
      const res = await createOrder(orderData);
      setMessage(res.data?.message || "Order placed successfully.");
      setForm(initialFormState);
      clearCart();
    } catch (err) {
      const apiError =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to place order. Please verify details and try again.";
      setError(apiError);
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const payNow = async () => {
    setError("");
    setMessage("");
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError("Unable to load payment gateway.");
        return;
      }

      const paymentRes = await createPaymentOrder(total * 100);
      const options = {
        key: paymentRes.data.key,
        amount: paymentRes.data.amount,
        currency: paymentRes.data.currency,
        name: "Petals & Floras",
        description: "Flower order payment",
        order_id: paymentRes.data.id,
        handler: async function (response) {
          try {
            const orderData = {
              ...form,
              items: cart,
              status: "Paid",
              payment_order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
            };
            const res = await createOrder(orderData);
            setMessage(res.data?.message || "Payment successful and order placed.");
            setForm(initialFormState);
            clearCart();
          } catch (err) {
            setError("Payment succeeded, but order save failed. Please contact support.");
          }
        },
        theme: {
          color: "#1f1f29",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      const apiError =
        err?.response?.data?.error || "Unable to start payment. Please try again.";
      setError(apiError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <h2>Checkout</h2>
      <p>
        <strong>Items:</strong> {cart.length} | <strong>Total:</strong> Rs {total}
      </p>

      <input name="name" placeholder="Name" value={form.name} onChange={handleChange} />
      <br />
      <br />
      <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} />
      <br />
      <br />
      <input
        name="address"
        placeholder="Address"
        value={form.address}
        onChange={handleChange}
      />
      <br />
      <br />
      <input name="city" placeholder="City" value={form.city} onChange={handleChange} />
      <br />
      <br />
      <input
        name="pincode"
        placeholder="Pincode"
        value={form.pincode}
        onChange={handleChange}
      />
      <br />
      <br />

      <button type="button" onClick={placeOrder} disabled={loading}>
        {loading ? "Placing..." : "Place Order"}
      </button>
      <button
        type="button"
        onClick={payNow}
        disabled={loading}
        style={{ marginLeft: "0.75rem" }}
      >
        {loading ? "Processing..." : "Pay Online (Razorpay)"}
      </button>

      {message ? <p style={{ color: "green" }}>{message}</p> : null}
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
    </div>
  );
}

export default Checkout;
