function loadProducts() {
  const productList = document.getElementById("product-container");
  if (!productList) {
    console.error("❌ Element with id 'product-container' not found.");
    return;
  }

  fetch("/api/products")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    })
    .then((products) => {
      productList.innerHTML = ""; // Clear existing content

      if (products.length === 0) {
        productList.innerHTML = "<p>No products found.</p>";
        return;
      }

      products.forEach((p) => {
        const html = `
                <div class="item" data-id="${p.id}">
                    <img src="${p.image_url}" class="img-fluid" alt="${p.title}">
                    <h3>${p.title}</h3>
                    <span id="dis">Discount: ${p.discount}%</span>
                    <p class="prices">₹${p.price}</p>
                    <div class="actions">
                        <form class="pay-form" style="display:inline;">
                            <input type="hidden" name="name" value="${p.title}">
                            <input type="hidden" name="amount" value="${p.price}">
                            <input type="hidden" name="description" value="${p.description}">
                            <input type="submit" class="buy-btn" value="Buy Now">
                        </form>
                        <button onclick="window.open('${p.view_link}', '_blank')">View</button>
                        <button onclick="editProduct(${p.id})">Edit</button>
                        <button onclick="deleteProduct(${p.id})">Delete</button>
                    </div>
                </div>
                `;
        productList.innerHTML += html;
      });
    })
    .catch((error) => {
      productList.innerHTML = `<p style="color:red;">⚠️ Error: ${error.message}</p>`;
      console.error("Error loading products:", error);
    });
}
