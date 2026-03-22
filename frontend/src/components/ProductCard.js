function ProductCard({ product, addToCart }) {
  const { name, price, old_price, description } = product;

  return (
    <div className="product-card">
      <div className="product-image">
        <div style={{ width: '100%', height: '100%', background: '#f8f1f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
          {name.toLowerCase().includes('rose') ? '🌹' : 
           name.toLowerCase().includes('lily') ? '🌷' : 
           name.toLowerCase().includes('daisy') ? '🌼' : '💐'}
        </div>
      </div>
      <div className="product-info">
        <div className="card-meta">{product.category || "Floral"}</div>
        <h3>{name}</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '1rem', height: '3em', overflow: 'hidden' }}>
          {description}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="price-tag">
            ₹{price}
            {old_price && <span className="price-old">₹{old_price}</span>}
          </div>
          <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', borderRadius: '12px' }} onClick={() => addToCart(product)}>
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
