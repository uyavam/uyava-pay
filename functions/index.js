require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Показує HTML-сторінку з кнопкою
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/create-wayforpay-payment", async (req, res) => {
  const { amount, orderReference, clientEmail, productName, productCount, productPrice } = req.body;

  const merchantAccount = process.env.WFP_MERCHANT;
  const merchantSecretKey = process.env.WFP_SECRET;

  const data = {
    transactionType: "CREATE_INVOICE",
    apiVersion: 1,
    merchantAccount: merchantAccount,
    merchantDomainName: "uyava.shopify.com",
    orderReference: orderReference,
    orderDate: Math.floor(Date.now() / 1000),
    amount: amount,
    currency: "UAH",
    productName: Array.isArray(productName) ? productName : [productName],
    productCount: Array.isArray(productCount) ? productCount : [productCount || 1],
    productPrice: Array.isArray(productPrice) ? productPrice : [productPrice || amount],
    clientEmail: clientEmail,
    language: "UA",
  };

  const signatureSource = [
    data.merchantAccount,
    data.merchantDomainName,
    data.orderReference,
    data.orderDate,
    data.amount,
    data.currency,
    ...data.productName,
    ...data.productCount,
    ...data.productPrice,
  ].join(";");

  data.merchantSignature = crypto
    .createHmac("md5", merchantSecretKey)
    .update(signatureSource)
    .digest("hex");

  try {
    const response = await axios.post("https://api.wayforpay.com/api", data, {
      headers: { "Content-Type": "application/json" },
    });

    if (response.data.invoiceUrl) {
      res.status(200).json({ invoiceUrl: response.data.invoiceUrl });
    } else {
      res.status(500).json({
        error: "WayForPay не повернув invoiceUrl",
        response: response.data,
      });
    }
  } catch (error) {
    console.error("Помилка:", error.response?.data || error.message);
    res.status(500).json({
      error: "Помилка створення платежу",
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер WayForPay API запущено на порту ${PORT}`);
});
