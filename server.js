import express from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import querystring from "querystring";
import { handleRegistration } from "./handleRegistration.js";
import { handleCancelRegistration } from "./handleCancelRegistration.js";
import { sendGetRequest } from "./sendGetRequest.js";

const app = express();
app.use(express.json());

// Tambahkan middleware CORS di sini
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Ganti dengan domain yang diizinkan
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Credentials", "true"); // Menambahkan header untuk mengizinkan kredensial (misalnya cookies) dalam permintaan lintas domain
  res.header("Access-Control-Expose-Headers", "Content-Length"); // Menambahkan header yang akan diekspos kepada browser pada respon
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
  } else {
    next();
  }
});

const {
  WEBHOOK_VERIFY_TOKEN,
  GRAPH_API_TOKEN,
  BUSINESS_PHONE_NUMBER_ID,
  PORT,
} = process.env;

app.post("/webhook", async (req, res) => {
  let body_content = req.body;
  // log incoming messages
  console.log("Incoming webhook message:", JSON.stringify(req.body, null, 2));

  // check if the webhook request contains a message
  // details on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  const message = req.body.entry?.[0]?.changes[0]?.value?.messages?.[0];
  const business_phone_number_id =
    req.body.entry?.[0].changes?.[0].value?.metadata?.phone_number_id;
  // Array of keywords
  const keywords = [
    "terimakasih",
    "hai",
    "hello",
    "daftar",
    "batal",
    "pasienbaru",
  ];
  const textWelcome =
    "Hai. Selamat Datang di *chatbot RSUD Daha Husada*.\n\n" +
    "Gunakan Keyword *PASIENBARU* untuk mendaftar pasien baru\n\n" +
    "Gunakan Keyword *DAFTAR* untuk mendaftar :\n" +
    "DAFTAR#POLIKLINIK#NO.PASIEN\n\n" +
    "Gunakan keyword *BATAL* untuk membatalkan pendaftaran :\n" +
    "BATAL#POLIKLINIK#NO.PASIEN";
  const textThanks =
    "Terimakasih telah mengunjungi ChatBot Pendaftaran Poliklinik *RSUD Daha Husada*.";

  // check if the incoming message contains text
  if (message?.type === "text") {
    // extract the business number to send the reply from it
    const business_phone_number_id =
      req.body.entry?.[0].changes?.[0].value?.metadata?.phone_number_id;

    // extract the text body from the message
    const textBody = message.text.body.toLowerCase();

    // Check if any of the keywords match
    const matchedKeyword = keywords.find((keyword) =>
      textBody.includes(keyword)
    );

    const data = {
      sender: message.from,
      keyword: matchedKeyword,
      poliklinik: textBody.split("#")[1] || "", // Asumsi format pesan: "#poliklinik#no_kartu_pasien"
      no_kartu_pasien: textBody.split("#")[2] || "",
      timestamp: new Date().toISOString(),
    };
    const dataNewPatien = {
      sender: message.from,
      timestamp: new Date().toISOString(),
    };

    // Prepare the reply message based on the matched keyword
    let replyMessage;
    if (matchedKeyword === "terimakasih") {
      replyMessage = textThanks;
    } else if (matchedKeyword === "hai" || matchedKeyword === "hello") {
      replyMessage = textWelcome;
      console.log(business_phone_number_id);
    } else if (matchedKeyword === "daftar") {
      replyMessage = await handleRegistration(data, message);
      console.error(replyMessage); // Menampilkan pesan balasan
    } else if (matchedKeyword === "batal") {
      replyMessage = await handleCancelRegistration(data, message);
    } else if (matchedKeyword === "pasienbaru") {
      replyMessage =
        "Silahkan klik link dibawah ini untuk mendaftar sebagai pasien baru!\n\n" +
        "https://anantaputra123.000webhostapp.com/view/antrian/dashboard.php";
      console.log(replyMessage);
      // await handleNewPatien(message.from, message);
      // await handleNewPatien("", dataNewPatien);
    } else {
      replyMessage = "Keyword yang anda masukan salah!\n\n" + textWelcome;
    }

    // send a reply message
    await axios({
      method: "POST",
      url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        to: message.from,
        text: { body: replyMessage.toString() },
        // context: {
        //   message_id: message.id, // shows the message as a reply to the original user message
        // },
      },
    });

    // mark incoming message as read
    await axios({
      method: "POST",
      url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        status: "read",
        message_id: message.id,
      },
    });
  }
  if (message?.type === "image") {
    // Extract business phone number to send the reply from it
    const business_phone_number_id =
      req.body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

    // Extract sender's WhatsApp ID
    const wappid = body_content.entry[0].changes[0].value.contacts[0].wa_id;
    const sender = message.from;

    // Extract image details
    const imageInfo = message.image;
    const mime_type = imageInfo.mime_type;
    const id = imageInfo.id;

    //membuat variable kosong
    let caption = "";
    let setCaption = "";
    let replyMessage = "";

    //kondisi jika caption tidak diberikan
    if (imageInfo.caption) {
      caption = imageInfo.caption.toLowerCase();
    } else {
      caption = `tidak ada caption`;
    }

    console.log("mime_type:", mime_type);
    console.log("id:", id);
    console.log(message.image.caption);
    console.log("sender : ", sender);

    // Check if the image has a caption
    if (caption.includes("ktp")) {
      setCaption = "ktp";
      const result = await sendGetRequest(id, wappid, sender, setCaption); // extract image details
      console.log(`result ktp: `, result);

      if (result.success === true) {
        replyMessage = "Terimakasih sudah mengirim foto KTP anda!";
      } else {
        replyMessage =
          "Kesalahan upload KTP. Ulangi untuk mengirim foto KTP anda!";
      }
    } else if (caption.includes("bpjs")) {
      setCaption = "bpjs";
      const result = await sendGetRequest(id, wappid, sender, setCaption); // extract image details
      console.log(`result bpjs: `, result);

      if (result.success === true) {
        replyMessage = "Terimakasih sudah mengirim foto kartu BPJS anda!";
      } else {
        replyMessage =
          "Kesalahan upload BPJS. Ulangi untuk mengirim foto kartu BPJS anda!";
      }
    } else if (caption.includes("rujukan")) {
      setCaption = "rujukan";
      const result = await sendGetRequest(id, wappid, sender, setCaption); // extract image details
      console.log(`result rujukan: `, result);

      if (result.success === true) {
        replyMessage = "Terimakasih sudah mengirim Rujukan anda!";
      } else {
        replyMessage =
          "Kesalahan upload Rujukan. Ulangi untuk mengirim Rujukan anda!";
      }
    } else if (caption.includes("bayar")) {
      setCaption = "bukti_bayar";
      const result = await sendGetRequest(id, wappid, sender, setCaption); // extract image details
      console.log(`result buktiBayar: `, result);

      if (result.success === true) {
        replyMessage = "Terimakasih sudah mengirim Bukti Bayar anda!";
      } else {
        replyMessage =
          "Kesalahan upload Bukti Bayar. Ulangi untuk mengirim Bukti Bayar anda!";
      }
    } else if (caption.includes("tidak ada caption")) {
      replyMessage =
        "Gunakan caption dengan benar!!\n" +
        "*CONTOH :* ktp, bpjs, atau rujukan";
    } else {
      console.log("caption bukan ktp tetapi : " + message.image.caption);
      replyMessage =
        "caption yang anda gunakan salah!!\n" +
        "*CONTOH :* ktp, bpjs, atau rujukan";
    }

    // send a reply message
    await axios({
      method: "POST",
      url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        to: message.from,
        text: { body: replyMessage.toString() },
        // context: {
        //   message_id: message.id, // shows the message as a reply to the original user message
        // },
      },
    });
    // mark incoming message as read
    await axios({
      method: "POST",
      url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        status: "read",
        message_id: message.id,
      },
    });
  }
  res.sendStatus(200);
});

//send message
app.post("/send-message", async (req, res) => {
  const { phoneNumber, messageText } = req.query;
  console.log("Request Headers:", req.headers);
  console.log("Request Body:", req.query);
  console.log("phoneNumber:", phoneNumber);
  console.log("messageText:", messageText);

  if (!phoneNumber || !messageText) {
    return res
      .status(400)
      .json({ error: "Missing phoneNumber or messageText" });
  }

  try {
    // Kirim pesan menggunakan API WhatsApp
    await axios({
      method: "POST",
      url: `https://graph.facebook.com/v18.0/${BUSINESS_PHONE_NUMBER_ID}/messages`,
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        to: phoneNumber,
        text: { body: messageText },
      },
    });

    res
      .status(200)
      .json({ success: true, message: "Message sent successfully" });
  } catch (error) {
    console.error(
      "Error sending message:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to send message" });
  }
});

// accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // check the mode and token sent are correct
  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    // respond with 200 OK and challenge token from the request
    res.status(200).send(challenge);
    console.log("Webhook verified successfully!");
  } else {
    // respond with '403 Forbidden' if verify tokens do not match
    res.sendStatus(403);
  }
});

app.get("/", (req, res) => {
  res.send(`<pre>Nothing to see here.
Checkout README.md to start.</pre>`);
});

app.listen(PORT, () => {
  console.log(`Server is listening on port: ${PORT}`);
});
