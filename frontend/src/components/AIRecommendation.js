import { useState } from "react";

function AIRecommendation() {
  const [occasion, setOccasion] = useState("");
  const [result, setResult] = useState("");

  const recommend = () => {
    if (occasion === "birthday") {
      setResult("🎂 Roses + Cake Combo");
    } else if (occasion === "love") {
      setResult("🌹 Red Rose Bouquet");
    } else if (occasion === "wedding") {
      setResult("💐 Luxury Flower Basket");
    } else {
      setResult("🌼 Mixed Flower Bouquet");
    }
  };

  return (
    <section className="ai-block">
      <h2>Find Perfect Flowers</h2>
      <div className="ai-controls">
        <select value={occasion} onChange={(e) => setOccasion(e.target.value)}>
          <option value="">Select Occasion</option>
          <option value="birthday">Birthday</option>
          <option value="love">Love</option>
          <option value="wedding">Wedding</option>
        </select>
        <button type="button" className="primary" onClick={recommend}>
          Suggest
        </button>
      </div>
      {result ? <h3>{result}</h3> : null}
    </section>
  );
}

export default AIRecommendation;
