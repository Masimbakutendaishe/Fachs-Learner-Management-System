const express = require('express');
const app = express();
const port = 3000;

// Import the product routes from the products/index.js file
const productRoutes = require('./pages/api/products/index');

// Use the product routes under the /api/products path
app.use('/api/products', productRoutes);

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
