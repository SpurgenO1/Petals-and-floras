function WhatsAppButton() {
  const whatsappUrl = "https://wa.me/918055895353?text=Hi, I'm interested in ordering flowers.";

  return (
    <a 
      href={whatsappUrl} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="whatsapp-sticky"
      title="Chat with us on WhatsApp"
    >
      <div style={{ fontSize: '1.5rem' }}>💬</div>
    </a>
  );
}

export default WhatsAppButton;
