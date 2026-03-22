import { Link } from "react-router-dom";

function Cart({ cart, removeFromCart }) {
  const total = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1),
    0
  );

  return (
    <div>
      <h2>Your Cart</h2>
      {cart.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          {cart.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "1px solid #e5e7eb",
                background: "#fff",
                borderRadius: 8,
                padding: "0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              <span>
                {item.name} - Rs {item.price} x {item.qty || 1}
              </span>
              <button onClick={() => removeFromCart(item.id)} type="button">
                Remove
              </button>
            </div>
          ))}
          <p>
            <strong>Total:</strong> Rs {total}
          </p>
          <Link to="/checkout">Proceed to Checkout</Link>
        </>
      )}
    </div>
  );
}

export default Cart;
